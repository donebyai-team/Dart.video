import * as Babel from "@babel/standalone";

export type VisualConsistancyRuleViolation = {
  rule: string;
  message: string;
  fix: string;
  line?: number;
  column?: number;
};

type NodeLike = {
  loc?:
    | {
        start?: {
          line?: number;
          column?: number;
        };
      }
    | null;
};

const TYPOGRAPHY_COMPONENTS = new Set(["Text", "Counter", "Typewriter", "WordCycle"]);
const VARIANT_SIZE: Record<string, number> = {
  caption: 0,
  label: 1,
  body: 2,
  subheading: 3,
  heading: 4,
  display: 5,
};

function createViolation(
  rule: string,
  message: string,
  fix: string,
  node?: NodeLike,
): VisualConsistancyRuleViolation {
  return {
    rule,
    message,
    fix,
    line: node?.loc?.start?.line,
    column: typeof node?.loc?.start?.column === "number" ? node.loc.start.column + 1 : undefined,
  };
}

function formatViolation(violation: VisualConsistancyRuleViolation): string {
  const location =
    typeof violation.line === "number"
      ? `Line ${violation.line}${typeof violation.column === "number" ? `:${violation.column}` : ""}: `
      : "";
  return `${location}[${violation.rule}] ${violation.message} Fix: ${violation.fix}`;
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
  }
  return undefined;
}

function getStringProp(openingElement: any, name: string): string | undefined {
  const value = getLiteralValue(getJsxAttribute(openingElement, name)?.value);
  return typeof value === "string" ? value : undefined;
}

function collectTypographyVariants(node: any, variants: string[]): void {
  if (!node || node.type !== "JSXElement") return;

  const openingElement = node.openingElement;
  const name = getJsxName(openingElement?.name);
  if (!name) return;

  if (name === "Row") return;

  if (TYPOGRAPHY_COMPONENTS.has(name)) {
    const variant = getStringProp(openingElement, "variant");
    if (variant && variant in VARIANT_SIZE) {
      variants.push(variant);
    }
  }

  for (const child of node.children ?? []) {
    if (child?.type === "JSXElement") {
      collectTypographyVariants(child, variants);
    }
  }
}

/*
// Inline unit — same variant, Row is fine
<Row gap={4} align="center">
  <Counter to={47} variant="heading" />
  <Text variant="heading">%</Text>
</Row>

// Descriptive label below — Stack is correct
<Stack gap={4} align="center">
  <Counter to={9800} variant="heading" />
  <Text variant="label">new users</Text>
</Stack>
*/
export function validateVisualConsistancyRules(code: string): VisualConsistancyRuleViolation[] {
  const parser = Babel.packages.parser;
  const traverse = Babel.packages.traverse.default;
  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  const violations: VisualConsistancyRuleViolation[] = [];
  const pushViolation = (violation: VisualConsistancyRuleViolation): void => {
    violations.push(violation);
  };

  traverse(ast, {
    JSXElement(path: any) {
      const openingElement = path.node.openingElement;
      if (getJsxName(openingElement?.name) !== "Row") return;

      const variants: string[] = [];
      for (const child of path.node.children ?? []) {
        if (child?.type === "JSXElement") {
          collectTypographyVariants(child, variants);
        }
      }

      for (let index = 1; index < variants.length; index += 1) {
        const previousVariant = variants[index - 1];
        const currentVariant = variants[index];
        const previousSize = VARIANT_SIZE[previousVariant];
        const currentSize = VARIANT_SIZE[currentVariant];

        if (Math.abs(currentSize - previousSize) >= 3) {
          pushViolation(
            createViolation(
              "variant-jump-in-row",
              `Variant jump from "${previousVariant}" to "${currentVariant}" inside a Row is too large and will look distorted.`,
              "Use Stack for size hierarchy. Use Row only when variants are similar in size.",
              openingElement,
            ),
          );
          break;
        }
      }
    },
  });

  return violations;
}

export function formatVisualConsistancyRuleViolations(violations: VisualConsistancyRuleViolation[]): string[] {
  return violations.map(formatViolation);
}
