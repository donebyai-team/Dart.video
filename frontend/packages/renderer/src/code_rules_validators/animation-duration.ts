import * as Babel from "@babel/standalone";
import {
  getComponentRegistration,
  getComponentTimingDefaults,
  resolveStyle,
} from "@coasterai/animation";
import { ANIMATION_PRIMIIVES } from "@coasterai/animation/src/registry/animation_primitives";
import { z } from "zod";

export const FALLBACK_SETTLED_FRAME = 130;
export const FALLBACK_DURATION_IN_FRAMES = 150;
export const TAIL_BUFFER = 20;
const MAX_SETTLED_FRAME = 240;
const CLEAN_STAGGER_DEFAULTS = resolveStyle("clean").motion.stagger;

const ANIMATION_PRIMITIVE_NAME_SET = new Set<string>(ANIMATION_PRIMIIVES);

type DurationResult = {
  settledFrame: number;
  durationInFrames: number;
};

function fallbackDuration(): DurationResult {
  return {
    settledFrame: FALLBACK_SETTLED_FRAME,
    durationInFrames: FALLBACK_DURATION_IN_FRAMES,
  };
}

function getJsxName(node: any): string | null {
  if (!node) return null;
  if (node.type === "JSXIdentifier") return node.name;
  return null;
}

function getJsxAttribute(openingElement: any, name: string): any | undefined {
  return openingElement?.attributes?.find(
    (attr: any) => attr.type === "JSXAttribute" && attr.name?.type === "JSXIdentifier" && attr.name.name === name,
  );
}

function getLiteralValue(node: any): unknown {
  if (!node) return true;
  if (node.type === "StringLiteral" || node.type === "NumericLiteral" || node.type === "BooleanLiteral") {
    return node.value;
  }
  if (node.type === "NullLiteral") return null;
  if (node.type === "JSXExpressionContainer") {
    const expr = node.expression;
    if (!expr) return undefined;
    if (expr.type === "StringLiteral" || expr.type === "NumericLiteral" || expr.type === "BooleanLiteral") {
      return expr.value;
    }
    if (expr.type === "NullLiteral") return null;
    if (expr.type === "UnaryExpression" && expr.operator === "-" && expr.argument.type === "NumericLiteral") {
      return -expr.argument.value;
    }
  }
  return undefined;
}

function getNumericProp(openingElement: any, name: string): number | undefined {
  const value = getLiteralValue(getJsxAttribute(openingElement, name)?.value);
  return typeof value === "number" ? value : undefined;
}

function getStringArrayProp(openingElement: any, name: string): string[] | undefined {
  const attr = getJsxAttribute(openingElement, name)?.value;
  if (!attr || attr.type !== "JSXExpressionContainer") return undefined;
  const expr = attr.expression;
  if (!expr || expr.type !== "ArrayExpression") return undefined;
  const values: string[] = [];
  for (const element of expr.elements ?? []) {
    if (!element || element.type !== "StringLiteral") return undefined;
    values.push(element.value);
  }
  return values;
}

function getDirectJsxElementChildren(node: any): any[] {
  return (node?.children ?? []).filter((child: any) => child?.type === "JSXElement");
}

function getRemoteComponentReturnExpression(ast: any): any | null {
  const body = ast?.program?.body ?? [];
  for (const node of body) {
    if (node.type !== "ExportDefaultDeclaration") continue;
    const decl = node.declaration;
    if (decl?.type !== "FunctionDeclaration" || decl.id?.name !== "RemoteComponent") continue;
    for (const statement of decl.body.body) {
      if (statement.type === "ReturnStatement") {
        return statement.argument ?? null;
      }
    }
  }
  return null;
}

function getDeclaredSettledFrameFromAst(ast: any): number | null {
  const body = ast?.program?.body ?? [];
  for (const node of body) {
    if (node.type !== "ExportNamedDeclaration" || node.declaration?.type !== "VariableDeclaration") continue;
    for (const declaration of node.declaration.declarations ?? []) {
      if (declaration.id?.type !== "Identifier" || declaration.id.name !== "settledFrame") continue;
      const value = getLiteralValue(declaration.init);
      return typeof value === "number" ? value : null;
    }
  }
  return null;
}

export function getDeclaredSettledFrame(code: string): number | null {
  try {
    const parser = Babel.packages.parser;
    const ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });
    return getDeclaredSettledFrameFromAst(ast);
  } catch {
    return null;
  }
}

/**
 * LLM-provided settledFrame contract validation.
 *
 * We trust an exported numeric `settledFrame` only when it is:
 * - present as a numeric literal export
 * - an integer
 * - greater than 0
 * - within the single-slide safety bound
 *
 * If any of those checks fail, the validator falls back to AST-derived timing.
 */
export function isValidDeclaredSettledFrame(settledFrame: number | null): settledFrame is number {
  return typeof settledFrame === "number" && Number.isInteger(settledFrame) && settledFrame > 0 && settledFrame <= MAX_SETTLED_FRAME;
}

function getSchemaDefaultNumber(name: string, prop: "startAt" | "durationInFrames" | "holdDuration" | "transitionDuration"): number | undefined {
  const registration = getComponentRegistration(name);
  const shape = registration?.fullSchema?.shape;
  const schema = shape?.[prop];
  if (!schema) return undefined;
  return extractSchemaDefaultNumber(schema);
}

function extractSchemaDefaultNumber(schema: z.ZodTypeAny): number | undefined {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return extractSchemaDefaultNumber(schema._def.innerType);
  }
  if (schema instanceof z.ZodDefault) {
    const value = schema._def.defaultValue();
    return typeof value === "number" ? value : undefined;
  }
  return undefined;
}

function collectEndFrames(node: any, inheritedOffset: number, endFrames: number[]): void {
  if (!node) return;

  if (node.type === "JSXFragment") {
    for (const child of node.children ?? []) {
      collectEndFrames(child, inheritedOffset, endFrames);
    }
    return;
  }

  if (node.type !== "JSXElement") return;

  const openingElement = node.openingElement;
  const name = getJsxName(openingElement?.name);
  if (!name) return;

  if (name === "Stagger") {
    const staggerDefaults = getComponentTimingDefaults("Stagger");
    const staggerStartAt = getNumericProp(openingElement, "startAt") ?? staggerDefaults?.startAt ?? 0;
    const staggerDelay = getNumericProp(openingElement, "staggerDelay") ?? CLEAN_STAGGER_DEFAULTS.staggerDelay;
    const childOffsetBase = inheritedOffset + staggerStartAt;
    const jsxChildren = getDirectJsxElementChildren(node);

    jsxChildren.forEach((child, index) => {
      collectEndFrames(child, childOffsetBase + index * staggerDelay, endFrames);
    });
    return;
  }

  const timingDefaults = getComponentTimingDefaults(name);
  const startAt = getNumericProp(openingElement, "startAt") ?? timingDefaults?.startAt ?? 0;
  const durationContract = getComponentRegistration(name)?.durationContract;

  // special handling for contrain primitives like wordcycle
  if (durationContract?.kind === "formula" && durationContract.strategy === "wordCycle") {
    const words = getStringArrayProp(openingElement, "words");
    if (words && words.length > 0) {
      const holdDuration = getNumericProp(openingElement, "holdDuration") ?? getSchemaDefaultNumber(name, "holdDuration");
      const transitionDuration =
        getNumericProp(openingElement, "transitionDuration") ?? getSchemaDefaultNumber(name, "transitionDuration");
      if (typeof holdDuration === "number" && typeof transitionDuration === "number") {
        endFrames.push(inheritedOffset + startAt + words.length * (holdDuration + transitionDuration));
      }
    }
  }

  if (ANIMATION_PRIMITIVE_NAME_SET.has(name)) {
    const durationInFrames = getNumericProp(openingElement, "durationInFrames") ?? timingDefaults?.durationInFrames;
    if (typeof durationInFrames === "number") {
      endFrames.push(inheritedOffset + startAt + durationInFrames);
    }
  }

  for (const child of node.children ?? []) {
    collectEndFrames(child, inheritedOffset, endFrames);
  }
}

export function computeAnimationDurationFromCode(code: string): DurationResult {
  try {
    const parser = Babel.packages.parser;
    const ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });

    const rootExpression = getRemoteComponentReturnExpression(ast);
    // Fallback when we cannot locate the generated component's returned JSX.
    if (!rootExpression) return fallbackDuration();

    const endFrames: number[] = [];
    collectEndFrames(rootExpression, 0, endFrames);

    // Fallback when no supported timing primitives can be derived from the JSX.
    if (endFrames.length === 0) return fallbackDuration();

    const settledFrame = Math.max(...endFrames);
    return {
      settledFrame,
      durationInFrames: settledFrame + TAIL_BUFFER,
    };
  } catch {
    // Fallback on any parse failure or unsupported syntax shape.
    return fallbackDuration();
  }
}
