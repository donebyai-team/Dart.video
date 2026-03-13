/**
 * AST ID Injection + Initial Overlay Extraction
 *
 * Single-pass Babel transform that walks LLM-generated JSX and:
 *
 *   1. Injects `id` on every element (except layout primitives)
 *   2. Extracts initial prop values into PatchOverlay format
 *   3. Injects style spread on raw HTML for runtime patch application
 *
 * ID format by element type:
 *   Registered primitive   → id="fadein-0", id="counter-1", id="text-3"
 *   Raw HTML element       → id="el-0", id="el-4"
 *   Unknown custom comp    → id="custom-0"
 *   Layout primitives      → no id (SafeArea, Stack, Row, AbsoluteCenter)
 *
 * The component name is derived from the ID prefix at runtime via
 * resolveComponentFromId() — no idToComponent mapping stored.
 *
 * COMPONENT_REGISTRY is the single source for component metadata.
 */

import * as Babel from "@babel/standalone";
import {
  REGISTERED_COMPONENT_NAMES,
  LAYOUT_COMPONENT_NAMES,
} from "@coasterai/animation";
import type { PatchOverlay } from "@coasterai/animation";

/** Preamble injected at top — gives raw HTML elements access to patches. */
const PREAMBLE = `var __patches = (typeof window !== 'undefined' && window.__PATCH_OVERLAY__) || {};`;

/**
 * Runs the AST pass. Returns transformed code + initial PatchOverlay.
 */
export function assignPrimitiveIds(code: string): {
  code: string;
  initialOverlay: PatchOverlay;
} {
  const initialOverlay: PatchOverlay = {};

  const counters = { primitive: {} as Record<string, number>, el: 0, custom: 0 };

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

  function createPlugin(babel: { types: any }) {
    const t = babel.types;

    /** Extract a static value from a JSX attribute value node. */
    function extractAttrValue(node: any): unknown | undefined {
      if (!node) return true; // boolean attr: <Foo bar />

      if (t.isStringLiteral(node)) return node.value;

      if (t.isJSXExpressionContainer(node)) {
        const expr = node.expression;
        if (t.isNumericLiteral(expr)) return expr.value;
        if (t.isStringLiteral(expr)) return expr.value;
        if (t.isBooleanLiteral(expr)) return expr.value;
        if (t.isNullLiteral(expr)) return null;
        if (t.isUnaryExpression(expr) && expr.operator === '-' && t.isNumericLiteral(expr.argument)) {
          return -expr.argument.value;
        }
        // Array of literals: words={["Hello", "World"]}
        if (t.isArrayExpression(expr)) {
          const values: unknown[] = [];
          for (const el of expr.elements) {
            if (t.isStringLiteral(el)) values.push(el.value);
            else if (t.isNumericLiteral(el)) values.push(el.value);
            else return undefined;
          }
          return values;
        }
        return undefined; // complex expression
      }

      return undefined;
    }

    /** Extract all literal props from JSX attributes. */
    function extractProps(attrs: any[]): Record<string, unknown> {
      const props: Record<string, unknown> = {};
      for (const attr of attrs) {
        if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name)) continue;
        const name: string = attr.name.name;
        if (name === 'id' || name === 'key' || name === 'ref' || name === 'style' || name === 'className') continue;
        const val = extractAttrValue(attr.value);
        if (val !== undefined) props[name] = val;
      }
      return props;
    }

    /** Extract text content from JSX children (single text child only). */
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

    /** Check if element already has an id attribute. */
    function hasIdAttr(attrs: any[]): boolean {
      return attrs.some(
        (attr: any) =>
          t.isJSXAttribute(attr) &&
          t.isJSXIdentifier(attr.name) &&
          attr.name.name === "id"
      );
    }

    /** Inject id="value" as first attribute. */
    function injectId(openingEl: any, id: string): void {
      openingEl.attributes.unshift(
        t.jsxAttribute(t.jsxIdentifier("id"), t.stringLiteral(id))
      );
    }

    /**
     * Inject `...__patches['el-0']?.styleOverride` spread into the style prop.
     * If no style prop exists, creates one: style={{ ...__patches['el-0']?.styleOverride }}
     */
    function injectStyleSpread(openingEl: any, id: string): void {
      // Build: __patches['el-0']?.styleOverride
      const patchExpr = t.optionalMemberExpression(
        t.memberExpression(
          t.identifier("__patches"),
          t.stringLiteral(id),
          true, // computed
        ),
        t.identifier("styleOverride"),
        false,
        true, // optional
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
          // Append spread to existing style object
          expr.properties.push(spreadElement);
        } else {
          // Style is a variable/expression — wrap: { ...existingStyle, ...patches }
          styleAttr.value = t.jsxExpressionContainer(
            t.objectExpression([
              t.spreadElement(t.cloneNode(expr, true)),
              spreadElement,
            ])
          );
        }
      } else if (!styleAttr) {
        // No style prop — create one with just the patch spread
        openingEl.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier("style"),
            t.jsxExpressionContainer(
              t.objectExpression([spreadElement])
            )
          )
        );
      }
    }

    /** Is this a lowercase HTML element name? */
    function isHtmlElement(name: string): boolean {
      return name[0] === name[0].toLowerCase() && name[0] !== name[0].toUpperCase();
    }

    return {
      visitor: {
        JSXOpeningElement(path: { node: any; parent: any }) {
          const nameNode = path.node.name;
          if (!t.isJSXIdentifier(nameNode)) return;

          const name: string = nameNode.name;
          const attrs = path.node.attributes;

          // Skip if already has id (double-pass safety)
          if (hasIdAttr(attrs)) return;

          // ── Layout primitives → no id ─────────────────────────────────
          if (LAYOUT_COMPONENT_NAMES.has(name)) return;

          // ── Registered primitive → id="{name}-{n}" ────────────────────
          if (REGISTERED_COMPONENT_NAMES.has(name)) {
            const id = nextPrimitiveId(name);
            injectId(path.node, id);

            // Extract props into overlay as value patches
            const props = extractProps(attrs);

            // Also grab text children for content components (Text, etc.)
            const textContent = extractTextChildren(path.parent);
            if (textContent !== undefined) props['children'] = textContent;

            if (Object.keys(props).length > 0) {
              initialOverlay[id] = { value: props };
            }
            return;
          }

          // ── Raw HTML element → id="el-{n}" ────────────────────────────
          if (isHtmlElement(name)) {
            const id = nextElId();
            injectId(path.node, id);
            injectStyleSpread(path.node, id);
            // No initial overlay entry — styleOverride starts empty
            return;
          }

          // ── Unknown custom component → id="custom-{n}" ────────────────
          const id = nextCustomId();
          injectId(path.node, id);
          injectStyleSpread(path.node, id);
          // No initial overlay entry — styleOverride starts empty
        },
      },
    };
  }

  try {
    const result = Babel.transform(code, {
      plugins: [createPlugin],
      presets: ["react", "typescript"],
      filename: "ast-pass.tsx",
      sourceType: "script",
    } as Parameters<typeof Babel.transform>[1]);

    if (!result?.code) {
      return { code, initialOverlay };
    }

    // Prepend __patches variable for raw HTML style spreads
    const hasRawHtml = counters.el > 0 || counters.custom > 0;
    const finalCode = hasRawHtml
      ? PREAMBLE + "\n" + result.code
      : result.code;

    return { code: finalCode, initialOverlay };
  } catch (err) {
    console.warn("[ast-pass] Transform failed:", err);
    return { code, initialOverlay };
  }
}
