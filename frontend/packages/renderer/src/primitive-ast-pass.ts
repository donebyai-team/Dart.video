/**
 * AST ID Injection + Initial Overlay Extraction
 *
 * Pass 1 walks LLM-generated JSX/TSX and:
 *
 *   1. Injects `id` on every element (except layout primitives)
 *   2. Extracts initial prop values into PatchOverlay format
 *
 * Pass 2 takes the ID-assigned JSX/TSX and:
 *
 *   1. Injects style spread on raw HTML/custom elements
 *   2. Compiles the code to executable JS
 *
 * ID format by element type:
 *   Registered primitive   -> id="fadein-0", id="counter-1", id="text-3"
 *   Raw HTML element       -> id="el-0", id="el-4"
 *   Unknown custom comp    -> id="custom-0"
 *   Layout primitives      -> no id (SafeArea, Stack, Row, AbsoluteCenter)
 */

import * as Babel from "@babel/standalone";
import {
  getComponentRegistration,
  REGISTERED_COMPONENT_NAMES,
  LAYOUT_COMPONENT_NAMES,
} from "@coasterai/animation";
import type { PatchOverlay } from "@coasterai/animation";
import { z } from "zod";

/** Preamble injected at top — gives raw HTML elements access to patches. */
const PREAMBLE = `var __patches = (typeof window !== 'undefined' && window.__PATCH_OVERLAY__) || {};`;

type AstPassCounters = {
  primitive: Record<string, number>;
  el: number;
  custom: number;
};

type IdAssignmentResult = {
  code: string;
  initialOverlay: PatchOverlay;
};

function createCounters(): AstPassCounters {
  return { primitive: {}, el: 0, custom: 0 };
}

function createIdAssignmentPlugin(
  counters: AstPassCounters,
  initialOverlay: PatchOverlay,
) {
  return function plugin(babel: { types: any }) {
    const t = babel.types;

    function nextPrimitiveId(componentName: string): string {
      const key = componentName.toLowerCase();
      const idx = counters.primitive[key] ?? 0;
      counters.primitive[key] = idx + 1;
      return `${key}-${idx}`;
    }

    function nextElId(): string {
      return `el-${counters.el++}`;
    }

    function nextCustomId(): string {
      return `custom-${counters.custom++}`;
    }

    function extractAttrValue(node: any): unknown | undefined {
      if (!node) return true;
      if (t.isStringLiteral(node)) return node.value;

      if (t.isJSXExpressionContainer(node)) {
        const expr = node.expression;
        if (t.isNumericLiteral(expr)) return expr.value;
        if (t.isStringLiteral(expr)) return expr.value;
        if (t.isBooleanLiteral(expr)) return expr.value;
        if (t.isNullLiteral(expr)) return null;
        if (t.isUnaryExpression(expr) && expr.operator === "-" && t.isNumericLiteral(expr.argument)) {
          return -expr.argument.value;
        }
        if (t.isArrayExpression(expr)) {
          const values: unknown[] = [];
          for (const el of expr.elements) {
            if (t.isStringLiteral(el)) values.push(el.value);
            else if (t.isNumericLiteral(el)) values.push(el.value);
            else return undefined;
          }
          return values;
        }
      }

      return undefined;
    }

    function extractProps(attrs: any[]): Record<string, unknown> {
      const props: Record<string, unknown> = {};
      for (const attr of attrs) {
        if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name)) continue;
        const name = attr.name.name;
        if (name === "id" || name === "key" || name === "ref" || name === "style" || name === "className") {
          continue;
        }
        const val = extractAttrValue(attr.value);
        if (val !== undefined) props[name] = val;
      }
      return props;
    }

    function extractSchemaDefault(schema: z.ZodTypeAny): unknown {
      if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
        return extractSchemaDefault(schema._def.innerType);
      }
      if (schema instanceof z.ZodDefault) {
        return schema._def.defaultValue();
      }
      return undefined;
    }

    function extractSchemaDefaults(componentName: string): Record<string, unknown> {
      const shape = getComponentRegistration(componentName)?.fullSchema?.shape;
      if (!shape) return {};

      const defaults: Record<string, unknown> = {};
      for (const [name, schema] of Object.entries(shape)) {
        if (name === "id" || name === "key" || name === "ref" || name === "style" || name === "className") {
          continue;
        }

        const value = extractSchemaDefault(schema);
        if (value !== undefined) defaults[name] = value;
      }

      return defaults;
    }

    function extractTextChildren(parent: any): string | undefined {
      if (!parent || !t.isJSXElement(parent)) return undefined;
      const children = parent.children;
      if (!children || children.length !== 1) return undefined;
      const child = children[0];
      if (t.isJSXText(child)) {
        const text = (child.value as string).trim();
        return text || undefined;
      }
      if (t.isJSXExpressionContainer(child) && t.isStringLiteral(child.expression)) {
        return child.expression.value;
      }
      return undefined;
    }

    function hasIdAttr(attrs: any[]): boolean {
      return attrs.some(
        (attr: any) =>
          t.isJSXAttribute(attr) &&
          t.isJSXIdentifier(attr.name) &&
          attr.name.name === "id"
      );
    }

    function injectId(openingEl: any, id: string): void {
      openingEl.attributes.unshift(
        t.jsxAttribute(t.jsxIdentifier("id"), t.stringLiteral(id))
      );
    }

    function isHtmlElement(name: string): boolean {
      return name[0] === name[0].toLowerCase() && name[0] !== name[0].toUpperCase();
    }

    return {
      visitor: {
        JSXOpeningElement(path: { node: any; parent: any }) {
          const nameNode = path.node.name;
          if (!t.isJSXIdentifier(nameNode)) return;

          const name = nameNode.name;
          const attrs = path.node.attributes;

          if (hasIdAttr(attrs)) return;
          if (LAYOUT_COMPONENT_NAMES.has(name)) return;

          if (REGISTERED_COMPONENT_NAMES.has(name)) {
            const id = nextPrimitiveId(name);
            injectId(path.node, id);

            const props = {
              ...extractSchemaDefaults(name),
              ...extractProps(attrs),
            };
            const textContent = extractTextChildren(path.parent);
            if (textContent !== undefined) props.children = textContent;

            if (Object.keys(props).length > 0) {
              initialOverlay[id] = props;
            }
            return;
          }

          if (isHtmlElement(name)) {
            injectId(path.node, nextElId());
            return;
          }

          injectId(path.node, nextCustomId());
        },
      },
    };
  };
}

function createTransformAssignedIdsPlugin(counters: AstPassCounters) {
  return function plugin(babel: { types: any }) {
    const t = babel.types;

    function injectStyleSpread(openingEl: any, id: string): void {
      const patchExpr = t.optionalMemberExpression(
        t.memberExpression(t.identifier("__patches"), t.stringLiteral(id), true),
        t.identifier("style"),
        false,
        true,
      );

      const spreadElement = t.spreadElement(
        t.logicalExpression("||", patchExpr, t.objectExpression([]))
      );

      const styleAttr = openingEl.attributes.find(
        (a: any) => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name, { name: "style" }),
      );

      if (styleAttr && t.isJSXExpressionContainer(styleAttr.value)) {
        const expr = styleAttr.value.expression;
        if (t.isObjectExpression(expr)) {
          expr.properties.push(spreadElement);
        } else {
          styleAttr.value = t.jsxExpressionContainer(
            t.objectExpression([
              t.spreadElement(t.cloneNode(expr, true)),
              spreadElement,
            ])
          );
        }
      } else if (!styleAttr) {
        openingEl.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier("style"),
            t.jsxExpressionContainer(t.objectExpression([spreadElement]))
          )
        );
      }
    }

    function isHtmlElement(name: string): boolean {
      return name[0] === name[0].toLowerCase() && name[0] !== name[0].toUpperCase();
    }

    function getIdAttr(attrs: any[]): string | undefined {
      for (const attr of attrs) {
        if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name, { name: "id" })) continue;
        if (t.isStringLiteral(attr.value)) return attr.value.value;
      }
      return undefined;
    }

    function hasStylePatchSpread(styleAttr: any): boolean {
      if (!styleAttr || !t.isJSXExpressionContainer(styleAttr.value)) return false;
      const expr = styleAttr.value.expression;
      if (!t.isObjectExpression(expr)) return false;

      return expr.properties.some((prop: any) => {
        if (!t.isSpreadElement(prop)) return false;
        const argument = prop.argument;
        return (
          t.isLogicalExpression(argument, { operator: "||" }) &&
          t.isOptionalMemberExpression(argument.left) &&
          t.isIdentifier(argument.left.property, { name: "style" })
        );
      });
    }

    return {
      visitor: {
        JSXOpeningElement(path: { node: any }) {
          const nameNode = path.node.name;
          if (!t.isJSXIdentifier(nameNode)) return;

          const name = nameNode.name;
          const attrs = path.node.attributes;
          const id = getIdAttr(attrs);
          if (!id) return;
          if (LAYOUT_COMPONENT_NAMES.has(name)) return;

          if (isHtmlElement(name)) {
            counters.el += 1;
            const styleAttr = attrs.find(
              (a: any) => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name, { name: "style" }),
            );
            if (!hasStylePatchSpread(styleAttr)) injectStyleSpread(path.node, id);
            return;
          }

          if (!REGISTERED_COMPONENT_NAMES.has(name)) {
            counters.custom += 1;
            const styleAttr = attrs.find(
              (a: any) => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name, { name: "style" }),
            );
            if (!hasStylePatchSpread(styleAttr)) injectStyleSpread(path.node, id);
          }
        },
      },
    };
  };
}

function runBabelTransform(code: string, plugin: any): string | undefined {
  const result = Babel.transform(code, {
    plugins: [plugin],
    filename: "ast-pass.tsx",
    sourceType: "unambiguous",
    parserOpts: {
      plugins: ["jsx", "typescript"],
    },
    generatorOpts: {
      retainLines: true,
    },
    ast: false,
    code: true,
    configFile: false,
    babelrc: false,
  } as Parameters<typeof Babel.transform>[1]);

  if (!result || typeof result.code !== "string") {
    return undefined;
  }

  return result.code;
}

/**
 * Pass 1: inject IDs while keeping the original JSX/TSX shape.
 */
export function assignPrimitiveIds(code: string): IdAssignmentResult {
  const counters = createCounters();
  const initialOverlay: PatchOverlay = {};

  try {
    const assignedCode = runBabelTransform(
      code,
      createIdAssignmentPlugin(counters, initialOverlay),
    );

    if (!assignedCode) {
      return { code, initialOverlay };
    }

    return { code: assignedCode, initialOverlay };
  } catch (err) {
    console.warn("[ast-pass] ID assignment failed:", err);
    return { code, initialOverlay: {} };
  }
}

/**
 * Pass 2: compile JSX/TSX that already has IDs assigned into executable JS.
 */
export function transformAssignedPrimitiveIds(codeWithAssignedIds: string): string {
  const counters = createCounters();

  try {
    const result = Babel.transform(codeWithAssignedIds, {
      plugins: [createTransformAssignedIdsPlugin(counters)],
      presets: ["react", "typescript"],
      filename: "ast-pass.tsx",
      sourceType: "unambiguous",
      configFile: false,
      babelrc: false,
    } as Parameters<typeof Babel.transform>[1]);

    if (!result?.code) {
      return codeWithAssignedIds;
    }

    const hasRawHtml = counters.el > 0 || counters.custom > 0;
    return hasRawHtml ? PREAMBLE + "\n" + result.code : result.code;
  } catch (err) {
    console.warn("[ast-pass] Transform failed:", err);
    return codeWithAssignedIds;
  }
}
