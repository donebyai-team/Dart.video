import * as Babel from "@babel/standalone";

export type PromptRuleViolation = {
  rule: string;
  message: string;
  fix: string;
  line?: number;
  column?: number;
};

const SPACING_TOKENS = new Set([4, 8, 12, 16, 24, 32, 48, 64, 96]);
const ALLOWED_REACT_HOOKS = new Set(["useEffect", "useMemo", "useRef", "useState"]);
const ANIMATION_COMPONENT_NAMES = new Set([
  "FadeIn",
  "FadeOut",
  "SlideIn",
  "SlideOut",
  "ScaleIn",
  "ScaleOut",
  "Stagger",
  "TimelineGate",
]);
const BANNED_STYLE_KEYS = new Map([
  ["transform", "Remove inline transform. Use animation primitives for movement."],
  ["color", "Remove inline color. Colors come from the design system."],
  ["fontSize", "Remove inline fontSize. Use the Text variant prop instead."],
  ["fontWeight", "Remove inline fontWeight. Typography comes from the design system."],
  ["letterSpacing", "Remove inline letterSpacing. Typography comes from the design system."],
  ["fontFamily", "Remove inline fontFamily. Typography comes from the design system."],
]);
const LAYOUT_STYLE_KEYS = new Set([
  "display",
  "flexDirection",
  "justifyContent",
  "alignItems",
  "alignContent",
  "flexWrap",
  "position",
]);

type NodeLike = {
  loc?: {
    start?: {
      line?: number;
      column?: number;
    };
  };
};

function createViolation(
  rule: string,
  message: string,
  fix: string,
  node?: NodeLike,
): PromptRuleViolation {
  return {
    rule,
    message,
    fix,
    line: node?.loc?.start?.line,
    column: typeof node?.loc?.start?.column === "number" ? node.loc.start.column + 1 : undefined,
  };
}

function getJsxName(node: any): string | null {
  if (!node) return null;
  if (node.type === "JSXIdentifier") return node.name;
  if (node.type === "JSXMemberExpression") return null;
  return null;
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

function formatViolation(violation: PromptRuleViolation): string {
  const location =
    typeof violation.line === "number"
      ? `Line ${violation.line}${typeof violation.column === "number" ? `:${violation.column}` : ""}: `
      : "";
  return `${location}[${violation.rule}] ${violation.message} Fix: ${violation.fix}`;
}

function getStyleObjectExpression(attr: any): any | null {
  if (!attr?.value || attr.value.type !== "JSXExpressionContainer") return null;
  const expr = attr.value.expression;
  return expr?.type === "ObjectExpression" ? expr : null;
}

function hasVisibleGeometry(node: any): boolean {
  if (!node || node.type !== "JSXElement") return false;
  const styleAttr = getJsxAttribute(node.openingElement, "style");
  const styleObject = getStyleObjectExpression(styleAttr);
  if (!styleObject) return false;

  return styleObject.properties.some((prop: any) => {
    if (prop.type !== "ObjectProperty") return false;
    const key = prop.key?.type === "Identifier" ? prop.key.name : prop.key?.value;
    return key === "width" || key === "height" || key === "borderRadius";
  });
}

function isMeaningfulJsxChild(node: any): boolean {
  if (!node) return false;
  if (node.type === "JSXText") return node.value.trim().length > 0;
  if (node.type === "JSXElement") return true;
  if (node.type === "JSXExpressionContainer") {
    const expr = node.expression;
    return expr && expr.type !== "JSXEmptyExpression" && expr.type !== "NullLiteral";
  }
  return false;
}

function getMeaningfulJsxChildren(node: any): any[] {
  return (node?.children ?? []).filter(isMeaningfulJsxChild);
}

function isEmptyDivElement(node: any): boolean {
  if (!node || node.type !== "JSXElement") return false;
  if (getJsxName(node.openingElement?.name) !== "div") return false;
  if (hasVisibleGeometry(node)) return false;
  return getMeaningfulJsxChildren(node).length === 0;
}

function getJsxAttribute(openingElement: any, name: string): any | undefined {
  return openingElement.attributes.find(
    (attr: any) => attr.type === "JSXAttribute" && attr.name?.type === "JSXIdentifier" && attr.name.name === name,
  );
}

function getSpacingValue(attr: any): number | "dynamic" | undefined {
  const value = getLiteralValue(attr?.value);
  if (typeof value === "number") return value;
  if (value === undefined && attr?.value) return "dynamic";
  return undefined;
}

function isColorLiteral(value: unknown): boolean {
  return (
    typeof value === "string" &&
    (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value) ||
      /^rgba?\(/.test(value))
  );
}

function hasAbsoluteCenterAncestor(path: any): boolean {
  let current = path.parentPath;
  while (current) {
    if (current.isJSXElement?.()) {
      const name = getJsxName(current.node.openingElement?.name);
      if (name === "AbsoluteCenter") return true;
    }
    current = current.parentPath;
  }
  return false;
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

export function validatePromptRules(code: string): PromptRuleViolation[] {
  const parser = Babel.packages.parser;
  const traverse = Babel.packages.traverse.default;
  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  const violations: PromptRuleViolation[] = [];
  const pushViolation = (violation: PromptRuleViolation): void => {
    violations.push(violation);
  };

  let hasValidDefaultExport = false;

  for (const node of ast.program.body) {
    if (node.type === "ImportDeclaration") {
      pushViolation(
        createViolation(
          "no-imports",
          "Imports are not allowed in generated components.",
          'Remove all imports and use only the provided runtime components.',
          node,
        ),
      );
    }

    if (node.type === "ExportDefaultDeclaration") {
      const decl = node.declaration;
      if (decl?.type === "FunctionDeclaration" && decl.id?.name === "RemoteComponent" && decl.params.length === 0) {
        hasValidDefaultExport = true;
      }
    }
  }

  if (!hasValidDefaultExport) {
    pushViolation(
      createViolation(
        "component-contract",
        'Component must be declared exactly as `export default function RemoteComponent()`.',
        "Export a default `RemoteComponent` function with no parameters.",
        ast.program,
      ),
    );
  }

  const rootExpression = getRemoteComponentReturnExpression(ast);
  const rootName = rootExpression?.type === "JSXElement" ? getJsxName(rootExpression.openingElement?.name) : null;
  if (rootName !== "SafeArea") {
    pushViolation(
      createViolation(
        "safe-area-root",
        "The outermost returned JSX element must be SafeArea.",
        "Wrap the entire component output in a single SafeArea.",
        rootExpression ?? ast.program,
      ),
    );
  }

  traverse(ast, {
    CallExpression(path: any) {
      const callee = path.node.callee;
      if (callee.type === "Identifier") {
        const name = callee.name;
        if (name === "useCurrentFrame" || name === "interpolate" || name === "spring") {
          pushViolation(
            createViolation(
              "forbidden-remotion-api",
              `${name} cannot be used directly in generated components.`,
              "Remove the direct Remotion API call and use the provided animation primitives instead.",
              callee,
            ),
          );
          return;
        }

        if (/^use[A-Z]/.test(name) && !ALLOWED_REACT_HOOKS.has(name)) {
          pushViolation(
            createViolation(
              "forbidden-hook",
              `${name} looks like a direct hook usage that is not allowed here.`,
              "Remove the hook and express timing with the provided primitives instead.",
              callee,
            ),
          );
        }
      }
    },

    JSXExpressionContainer(path: any) {
      const expr = path.node.expression;
      if (expr?.type === "ConditionalExpression") {
        pushViolation(
          createViolation(
            "no-jsx-ternary",
            "JSX ternaries are not allowed for animated content.",
            "Replace conditional element rendering with TimelineGate or static structure.",
            expr,
          ),
        );
      }

      if (expr?.type === "LogicalExpression" && expr.operator === "&&") {
        pushViolation(
          createViolation(
            "no-jsx-logical-and",
            "JSX conditional rendering with `&&` is not allowed for animated content.",
            "Replace conditional element rendering with TimelineGate or static structure.",
            expr,
          ),
        );
      }
    },

    JSXElement(path: any) {
      const openingElement = path.node.openingElement;
      const name = getJsxName(openingElement.name);
      if (!name) return;

      if (name === "AbsoluteCenter" && hasAbsoluteCenterAncestor(path)) {
        pushViolation(
          createViolation(
            "nested-absolute-center",
            "Nested AbsoluteCenter components create overlapping layout.",
            "Use a single AbsoluteCenter and place a Stack or Row inside it.",
            openingElement,
          ),
        );
      }

      const childElements = getMeaningfulJsxChildren(path.node).filter((child) => child.type === "JSXElement");
      const absoluteCenterChildren = childElements.filter(
        (child) => getJsxName(child.openingElement?.name) === "AbsoluteCenter",
      );
      if (absoluteCenterChildren.length > 1) {
        pushViolation(
          createViolation(
            "multiple-absolute-center",
            "Multiple sibling AbsoluteCenter components will overlap each other.",
            "Use one AbsoluteCenter and place a Stack or Row inside it.",
            absoluteCenterChildren[1].openingElement,
          ),
        );
      }

      if (name === "div") {
        const styleAttr = getJsxAttribute(openingElement, "style");
        const styleObject = getStyleObjectExpression(styleAttr);
        const hasLayoutStyle = (styleObject?.properties ?? []).some((prop: any) => {
          if (prop.type !== "ObjectProperty") return false;
          const key = prop.key?.type === "Identifier" ? prop.key.name : prop.key?.value;
          return typeof key === "string" && LAYOUT_STYLE_KEYS.has(key);
        });
        const meaningfulChildren = getMeaningfulJsxChildren(path.node);
        if (hasLayoutStyle || meaningfulChildren.filter((child) => child.type === "JSXElement").length > 1) {
          pushViolation(
            createViolation(
              "no-layout-div",
              "Plain div cannot be used as a layout wrapper.",
              "Use Stack, Row, or AbsoluteCenter for layout, and reserve div for decorative shapes only.",
              openingElement,
            ),
          );
        }
      }

      const gapAttr = getJsxAttribute(openingElement, "gap");
      if (gapAttr) {
        const gapValue = getSpacingValue(gapAttr);
        if (gapValue === "dynamic" || (typeof gapValue === "number" && !SPACING_TOKENS.has(gapValue))) {
          pushViolation(
            createViolation(
              "invalid-gap-value",
              "gap must use one of the supported spacing tokens.",
              "Use a literal token value: 4, 8, 12, 16, 24, 32, 48, 64, or 96.",
              gapAttr,
            ),
          );
        }
      }

      const widthAttr = getJsxAttribute(openingElement, "width");
      const widthValue = getLiteralValue(widthAttr?.value);
      if (typeof widthValue === "string" && widthValue.trim().endsWith("%")) {
        pushViolation(
          createViolation(
            "no-percentage-width",
            "Percentage widths cause unpredictable layout in generated animations.",
            "Use a fixed numeric size or let the layout primitive size naturally.",
            widthAttr,
          ),
        );
      }

      if (ANIMATION_COMPONENT_NAMES.has(name)) {
        const meaningfulChildren = getMeaningfulJsxChildren(path.node);
        if (meaningfulChildren.length === 0) {
          pushViolation(
            createViolation(
              "empty-animation-wrapper",
              `${name} must wrap visible content.`,
              "Place visible content inside the animation primitive.",
              openingElement,
            ),
          );
        } else if (meaningfulChildren.length === 1 && isEmptyDivElement(meaningfulChildren[0])) {
          pushViolation(
            createViolation(
              "empty-div-animation",
              `${name} cannot animate an empty div.`,
              "Animate visible content or a decorative div with actual geometry.",
              openingElement,
            ),
          );
        }
      }

      const styleAttr = getJsxAttribute(openingElement, "style");
      const styleObject = getStyleObjectExpression(styleAttr);
      if (!styleObject) return;

      for (const prop of styleObject.properties) {
        if (prop.type !== "ObjectProperty") continue;
        const key = prop.key?.type === "Identifier" ? prop.key.name : prop.key?.value;
        if (typeof key !== "string") continue;
        const value = getLiteralValue(prop.value);

        if (BANNED_STYLE_KEYS.has(key)) {
          pushViolation(
            createViolation(
              `no-inline-${key}`,
              `${key} is not allowed in style props.`,
              BANNED_STYLE_KEYS.get(key) ?? "Remove the inline style override.",
              prop,
            ),
          );
        }

        if (key === "position" && (value === "absolute" || value === "fixed" || value === "relative")) {
          pushViolation(
            createViolation(
              "no-inline-position",
              "position absolute/fixed/relative is not allowed in generated layouts.",
              "Remove position styling and use AbsoluteCenter for absolute placement.",
              prop,
            ),
          );
        }

        if (key === "overflow" && value === "hidden") {
          pushViolation(
            createViolation(
              "no-overflow-hidden",
              "overflow:hidden clips animation entrances and causes visual glitches.",
              "Remove overflow:hidden from generated components.",
              prop,
            ),
          );
        }

        if (key === "width" && typeof value === "string" && value.trim().endsWith("%")) {
          pushViolation(
            createViolation(
              "no-percentage-width",
              "Percentage widths cause unpredictable layout in generated animations.",
              "Use a fixed numeric size or let the layout primitive size naturally.",
              prop,
            ),
          );
        }

        if (isColorLiteral(value)) {
          pushViolation(
            createViolation(
              "no-hardcoded-color",
              "Hardcoded color values are not allowed in style props.",
              "Remove the hardcoded color and rely on the design system colors.",
              prop,
            ),
          );
        }

        if (/^(padding|paddingTop|paddingRight|paddingBottom|paddingLeft|paddingInline|paddingBlock|margin|marginTop|marginRight|marginBottom|marginLeft|marginInline|marginBlock)$/.test(key)) {
          if (typeof value !== "number" || !SPACING_TOKENS.has(value)) {
            pushViolation(
              createViolation(
                "invalid-spacing-token",
                `${key} must use one of the supported spacing tokens.`,
                "Use a literal token value: 4, 8, 12, 16, 24, 32, 48, 64, or 96.",
                prop,
              ),
            );
          }
        }
      }
    },
  });

  return violations;
}

export function formatPromptRuleViolations(violations: PromptRuleViolation[]): string[] {
  return violations.map(formatViolation);
}
