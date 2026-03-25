import * as Babel from "@babel/standalone";
import { calculateComponentDuration, getComponentRegistration } from "@coasterai/animation";

export const FALLBACK_SETTLED_FRAME = 130;
export const FALLBACK_DURATION_IN_FRAMES = 150;
export const TAIL_BUFFER = 20;
const MAX_SETTLED_FRAME = 240;

type DurationResult = {
  settledFrame: number;
  durationInFrames: number;
};

type DurationError = {
  error: string;
  component?: string;
  field?: string;
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
 * If any of those checks fail, the validator falls back to component-based duration calculation.
 */
export function isValidDeclaredSettledFrame(settledFrame: number | null): settledFrame is number {
  return typeof settledFrame === "number" && Number.isInteger(settledFrame) && settledFrame > 0 && settledFrame <= MAX_SETTLED_FRAME;
}

/**
 * Extract props from a JSX element's opening tag.
 * Returns an object with all prop values that can be extracted as literals.
 */
function extractPropsFromJsxElement(openingElement: any): Record<string, any> {
  const props: Record<string, any> = {};
  
  for (const attr of openingElement?.attributes ?? []) {
    if (attr.type !== "JSXAttribute" || attr.name?.type !== "JSXIdentifier") continue;
    
    const propName = attr.name.name;
    const value = getLiteralValue(attr.value);
    
    // Special handling for array props
    if (value === undefined) {
      const arrayValue = getStringArrayProp(openingElement, propName);
      if (arrayValue !== undefined) {
        props[propName] = arrayValue;
      }
    } else {
      props[propName] = value;
    }
  }
  
  return props;
}

/**
 * Collect end frames from JSX tree using component registry's calculateDuration functions.
 * Returns errors if any component fails duration calculation.
 */
function collectEndFramesV2(
  node: any,
  inheritedOffset: number,
  endFrames: number[],
  errors: DurationError[]
): void {
  if (!node) return;

  if (node.type === "JSXFragment") {
    for (const child of node.children ?? []) {
      collectEndFramesV2(child, inheritedOffset, endFrames, errors);
    }
    return;
  }

  if (node.type !== "JSXElement") return;

  const openingElement = node.openingElement;
  const componentName = getJsxName(openingElement?.name);
  if (!componentName) return;

  // Extract props from JSX
  const props = extractPropsFromJsxElement(openingElement);
  const startAt = typeof props.startAt === "number" ? props.startAt : 0;

  // Look up component in registry
  const registration = getComponentRegistration(componentName);
  
  if (registration?.calculateDuration) {
    // Use the component's duration calculator
    const result = calculateComponentDuration(componentName, props);
    
    if (result.success) {
      endFrames.push(inheritedOffset + startAt + result.duration);
    } else {
      errors.push({
        error: result.error,
        component: componentName,
        field: result.field,
      });
    }
  } else {
    // Component doesn't have a duration calculator
    // This is OK for layout components, primitives without duration, etc.
    // Just traverse children
  }

  // Recursively process children
  for (const child of node.children ?? []) {
    collectEndFramesV2(child, inheritedOffset, endFrames, errors);
  }
}

/**
 * V2: Compute animation duration using component registry's calculateDuration functions.
 * 
 * This version:
 * - Parses JSX to extract component props
 * - Calls calculateDuration from component registry for each component
 * - Returns errors if any component fails validation
 * - Falls back to default duration if no components have duration calculators
 */
export function computeAnimationDurationFromCodeV2(code: string): DurationResult & { errors?: DurationError[] } {
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
    const errors: DurationError[] = [];
    collectEndFramesV2(rootExpression, 0, endFrames, errors);

    // If there are validation errors, return them
    if (errors.length > 0) {
      return {
        ...fallbackDuration(),
        errors,
      };
    }

    // Fallback when no components with duration calculators were found
    if (endFrames.length === 0) return fallbackDuration();

    const settledFrame = Math.max(...endFrames);
    return {
      settledFrame,
      durationInFrames: settledFrame + TAIL_BUFFER,
    };
  } catch (error) {
    // Fallback on any parse failure or unsupported syntax shape.
    return {
      ...fallbackDuration(),
      errors: [{
        error: error instanceof Error ? error.message : "Failed to parse code",
      }],
    };
  }
}
