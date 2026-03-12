/**
 * Primitive AST ID Assignment Pass
 *
 * Walks LLM-generated JSX code and injects a structured `id` prop on every
 * element whose name matches a registered animation primitive or scene component.
 *
 * ID format: {componentType}-{index}  (e.g. "fadein-0", "counter-2", "titlecard-0")
 * Index is per-component-type, assigned in depth-first document order.
 *
 * This is the new, simple replacement for the fragile raw-Remotion-call
 * instrumentation in the legacy system. Patchable surface = component props only.
 *
 * Two code paths are mutually exclusive per element:
 *   - Primitive-backed (name in registry)  → this pass assigns an id
 *   - Legacy raw Remotion elements          → existing __patch helpers handle them
 */

import * as Babel from "@babel/standalone";
import { REGISTERED_COMPONENT_NAMES } from "@coasterai/animation";

export interface PrimitiveIdRegistry {
  /** Map from element id (e.g. "fadein-0") to component name (e.g. "FadeIn") */
  idToComponent: Record<string, string>;
  /** Map from component name to array of assigned ids (in document order) */
  componentToIds: Record<string, string[]>;
}

/**
 * Runs the primitive ID assignment Babel pass over already-stripped (no imports)
 * JSX source. Returns the transformed code and the id registry.
 */
export function assignPrimitiveIds(code: string): {
  code: string;
  registry: PrimitiveIdRegistry;
} {
  const idRegistry: PrimitiveIdRegistry = {
    idToComponent: {},
    componentToIds: {},
  };

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

    return {
      visitor: {
        JSXOpeningElement(path: { node: any }) {
          const nameNode = path.node.name;

          // Only handle simple identifier names (not member expressions like Foo.Bar)
          if (!t.isJSXIdentifier(nameNode)) return;

          const componentName: string = nameNode.name;

          // Only process registered primitives — not plain HTML, not unknown components
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

          // Record in registry
          idRegistry.idToComponent[id] = componentName;
          if (!idRegistry.componentToIds[componentName]) {
            idRegistry.componentToIds[componentName] = [];
          }
          idRegistry.componentToIds[componentName]?.push(id);

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
      return { code, registry: idRegistry };
    }

    return { code: result.code, registry: idRegistry };
  } catch (err) {
    // ID pass failure is non-fatal — return original code with empty registry
    console.warn("[primitive-ast-pass] ID assignment failed:", err);
    return { code, registry: idRegistry };
  }
}
