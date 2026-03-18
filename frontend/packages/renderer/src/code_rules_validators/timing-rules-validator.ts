import * as Babel from "@babel/standalone";

export type TimingRuleViolation = {
  rule: string;
  message: string;
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

type TimingWindow = {
  start: number;
  end: number;
  name: string;
  node: any;
};

const SEQUENTIAL_HOLD_FRAMES = 6;
const MAX_SLIDE_FRAMES = 240;
const TIMED_COMPONENTS = new Set([
  "FadeIn",
  "FadeOut",
  "SlideIn",
  "SlideOut",
  "ScaleIn",
  "ScaleOut",
  "Counter",
  "Typewriter",
  "TimelineGate",
]);

function createViolation(rule: string, message: string, node?: NodeLike): TimingRuleViolation {
  return {
    rule,
    message,
    line: node?.loc?.start?.line,
    column: typeof node?.loc?.start?.column === "number" ? node.loc.start.column + 1 : undefined,
  };
}

function formatViolation(violation: TimingRuleViolation): string {
  const location =
    typeof violation.line === "number"
      ? `Line ${violation.line}${typeof violation.column === "number" ? `:${violation.column}` : ""}: `
      : "";
  return `${location}[${violation.rule}] ${violation.message}`;
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

function getStringProp(openingElement: any, name: string): string | undefined {
  const value = getLiteralValue(getJsxAttribute(openingElement, name)?.value);
  return typeof value === "string" ? value : undefined;
}

function getMeaningfulJsxChildren(node: any): any[] {
  return (node?.children ?? []).filter((child: any) => {
    if (!child) return false;
    if (child.type === "JSXText") return child.value.trim().length > 0;
    if (child.type === "JSXElement") return true;
    if (child.type === "JSXExpressionContainer") {
      return child.expression && child.expression.type !== "JSXEmptyExpression" && child.expression.type !== "NullLiteral";
    }
    return false;
  });
}

function getTimingWindow(node: any): TimingWindow | null {
  if (!node || node.type !== "JSXElement") return null;
  const openingElement = node.openingElement;
  const name = getJsxName(openingElement?.name);
  if (!name || !TIMED_COMPONENTS.has(name)) return null;

  if (name === "TimelineGate") {
    const showAfter = getNumericProp(openingElement, "showAfter");
    const hideAfter = getNumericProp(openingElement, "hideAfter");
    if (typeof showAfter !== "number") return null;
    return {
      start: showAfter,
      end: typeof hideAfter === "number" ? hideAfter : showAfter,
      name,
      node: openingElement,
    };
  }

  const startAt = getNumericProp(openingElement, "startAt") ?? 0;
  const durationInFrames = getNumericProp(openingElement, "durationInFrames");
  if (typeof durationInFrames !== "number") return null;

  return {
    start: startAt,
    end: startAt + durationInFrames,
    name,
    node: openingElement,
  };
}

export function validateTimingRules(code: string): TimingRuleViolation[] {
  const parser = Babel.packages.parser;
  const traverse = Babel.packages.traverse.default;
  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  const violations: TimingRuleViolation[] = [];
  const timingWindows: TimingWindow[] = [];
  const pushViolation = (violation: TimingRuleViolation): void => {
    violations.push(violation);
  };

  traverse(ast, {
    JSXElement(path: any) {
      const openingElement = path.node.openingElement;
      const name = getJsxName(openingElement?.name);
      if (!name) return;

      const startAt = getNumericProp(openingElement, "startAt");
      const durationInFrames = getNumericProp(openingElement, "durationInFrames");
      const showAfter = getNumericProp(openingElement, "showAfter");
      const hideAfter = getNumericProp(openingElement, "hideAfter");

      if (typeof startAt === "number" && startAt < 0) {
        pushViolation(createViolation("negative-startAt", `${name} startAt must be 0 or greater.`, openingElement));
      }

      if (typeof durationInFrames === "number" && durationInFrames <= 0) {
        pushViolation(
          createViolation("nonpositive-duration", `${name} durationInFrames must be greater than 0.`, openingElement),
        );
      }

      if (typeof showAfter === "number" && showAfter < 0) {
        pushViolation(
          createViolation("negative-showAfter", `${name} showAfter must be 0 or greater.`, openingElement),
        );
      }

      if (typeof hideAfter === "number" && typeof showAfter === "number" && hideAfter <= showAfter) {
        pushViolation(
          createViolation(
            "timelinegate-order",
            "TimelineGate hideAfter must be greater than showAfter.",
            openingElement,
          ),
        );
      }

      if (name === "Typewriter") {
        const mode = getStringProp(openingElement, "mode") ?? "char";
        const text = getStringProp(openingElement, "text");
        if (typeof text === "string" && typeof durationInFrames === "number") {
          if (mode === "char") {
            const expected = text.length * 2;
            if (durationInFrames !== expected) {
              pushViolation(
                createViolation(
                  "typewriter-duration-char",
                  `Typewriter in char mode must use durationInFrames=${expected} for the provided text length.`,
                  openingElement,
                ),
              );
            }
          }

          if (mode === "word") {
            const expected = text.trim().split(/\s+/).filter(Boolean).length * 10;
            if (durationInFrames !== expected) {
              pushViolation(
                createViolation(
                  "typewriter-duration-word",
                  `Typewriter in word mode must use durationInFrames=${expected} for the provided word count.`,
                  openingElement,
                ),
              );
            }
          }
        }
      }

      const window = getTimingWindow(path.node);
      if (window) {
        timingWindows.push(window);
      }

      const childWindows = getMeaningfulJsxChildren(path.node)
        .filter((child: any) => child.type === "JSXElement")
        .map(getTimingWindow)
        .filter((child): child is TimingWindow => child !== null);

      for (let index = 1; index < childWindows.length; index += 1) {
        const previous = childWindows[index - 1];
        const current = childWindows[index];
        if (current.start === previous.start) continue;
        if (current.start < previous.end + SEQUENTIAL_HOLD_FRAMES) {
          pushViolation(
            createViolation(
              "sequential-hold",
              `${current.name} should start at least ${SEQUENTIAL_HOLD_FRAMES} frames after ${previous.name} ends, unless they form one visual unit and share the same startAt.`,
              current.node,
            ),
          );
        }
      }
    },
  });

  const maxEndFrame = timingWindows.reduce((max, window) => Math.max(max, window.end), 0);
  if (maxEndFrame > MAX_SLIDE_FRAMES) {
    pushViolation(
      createViolation(
        "max-slide-duration",
        `Timeline ends at frame ${maxEndFrame}; a single slide must not exceed ${MAX_SLIDE_FRAMES} frames.`,
        ast.program,
      ),
    );
  }

  return violations;
}

export function formatTimingRuleViolations(violations: TimingRuleViolation[]): string[] {
  return violations.map(formatViolation);
}
