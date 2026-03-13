/**
 * Primitive AST ID Assignment + Prop Extraction Pass
 *
 * Walks LLM-generated JSX code and:
 *   1. Injects a structured `id` prop on every registered primitive
 *   2. Extracts static prop values for the editor toolbar
 *
 * ID format: {componentType}-{index}  (e.g. "fadein-0", "counter-2", "titlecard-0")
 * Index is per-component-type, assigned in depth-first document order.
 *
 * Also extracts JSX attribute values so the editor knows the current prop values
 * without re-parsing. Only literal values are extracted — expressions are skipped.
 */

import * as Babel from "@babel/standalone";
import { REGISTERED_COMPONENT_NAMES, getComponentRegistration } from "@coasterai/animation";

/** Info about a single primitive element in the component tree. */
export interface PrimitiveElement {
  /** Assigned ID, e.g. "fadein-0" */
  id: string;
  /** Component name, e.g. "FadeIn" */
  componentName: string;
  /** Component type from registry: layout | animation | content | scene | headless */
  componentType: string;
  /** Static prop values extracted from JSX attributes */
  props: Record<string, unknown>;
  /** Editor-visible prop names (from COMPONENT_REGISTRY.editorProps) */
  editorProps: string[];
}

export interface PrimitiveIdRegistry {
  /** Map from element ID to element info */
  elements: Record<string, PrimitiveElement>;
}

/**
 * Runs the primitive ID assignment + prop extraction Babel pass over
 * already-stripped (no imports) JSX source. Returns the transformed code
 * and the registry.
 */
export function assignPrimitiveIds(code: string): {
  code: string;
  registry: PrimitiveIdRegistry;
} {
  const registry: PrimitiveIdRegistry = { elements: {} };

  // Per-component-type index counter. Reset for each call.
  const counters: Record<string, number> = {};

  function nextId(componentName: string): string {
    const key = componentName.toLowerCase();
    const idx = counters[key] ?? 0;
    counters[key] = idx + 1;
    return `${key}-${idx}`;
  }

  function createPrimitiveIdPlugin(babel: { types: any }) {
    const t = babel.types;

    /** Extract a static value from a JSX attribute value node. */
    function extractAttrValue(node: any): unknown | undefined {
      if (!node) return true; // boolean attribute with no value: <Foo bar /> → bar=true

      // value="string"
      if (t.isStringLiteral(node)) return node.value;

      // value={expression}
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
            else return undefined; // non-literal element — bail
          }
          return values;
        }
        return undefined; // complex expression — can't extract
      }

      return undefined;
    }

    return {
      visitor: {
        JSXOpeningElement(path: { node: any; parent: any }) {
          const nameNode = path.node.name;

          // Only handle simple identifier names (not member expressions like Foo.Bar)
          if (!t.isJSXIdentifier(nameNode)) return;

          const componentName: string = nameNode.name;

          // Only process registered primitives
          if (!REGISTERED_COMPONENT_NAMES.has(componentName)) return;

          // Check if an id prop already exists (in case of double-pass)
          const hasId = path.node.attributes.some(
            (attr: any) =>
              t.isJSXAttribute(attr) &&
              t.isJSXIdentifier(attr.name) &&
              attr.name.name === "id"
          );
          if (hasId) return;

          const id = nextId(componentName);
          const registration = getComponentRegistration(componentName);

          // Extract prop values from JSX attributes
          const props: Record<string, unknown> = {};
          for (const attr of path.node.attributes) {
            if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name)) continue;
            const propName: string = attr.name.name;
            // Skip internal props
            if (propName === 'id' || propName === 'key' || propName === 'ref') continue;
            const value = extractAttrValue(attr.value);
            if (value !== undefined) {
              props[propName] = value;
            }
          }

          // Also extract text children for content components
          if (path.parent && t.isJSXElement(path.parent)) {
            const children = path.parent.children;
            if (children?.length === 1) {
              const child = children[0];
              if (t.isJSXText(child)) {
                const text = (child.value as string).trim();
                if (text) props['children'] = text;
              } else if (t.isJSXExpressionContainer(child)) {
                const expr = child.expression;
                if (t.isStringLiteral(expr)) props['children'] = expr.value;
              }
            }
          }

          // Record in registry
          registry.elements[id] = {
            id,
            componentName,
            componentType: registration?.type ?? 'unknown',
            props,
            editorProps: registration?.editorProps ?? [],
          };

          // Inject id prop: id="fadein-0"
          const idAttr = t.jsxAttribute(
            t.jsxIdentifier("id"),
            t.stringLiteral(id)
          );

          path.node.attributes.unshift(idAttr);
        },
      },
    };
  }

  try {
    const result = Babel.transform(code, {
      plugins: [createPrimitiveIdPlugin],
      presets: ["react", "typescript"],
      filename: "primitive-id-pass.tsx",
      sourceType: "script",
    } as Parameters<typeof Babel.transform>[1]);

    if (!result?.code) {
      return { code, registry };
    }

    return { code: result.code, registry };
  } catch (err) {
    // ID pass failure is non-fatal — return original code with empty registry
    console.warn("[primitive-ast-pass] ID assignment failed:", err);
    return { code, registry };
  }
}
