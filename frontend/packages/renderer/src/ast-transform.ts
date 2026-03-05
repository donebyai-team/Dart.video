import * as Babel from "@babel/standalone";

// ─── Types ────────────────────────────────────────────────────────────────────

type VarEntry =
  | { type: "interpolate"; frameRange: number[]; outputRange: unknown[]; raw: unknown }
  | { type: "spring"; config: Record<string, unknown>; raw: unknown }
  | { type: "static"; value: string | number; raw: unknown }
  | { type: "computed" }
  | { type: "unknown" };

export interface AnimatedPropInfo {
  type: "interpolate" | "spring";
  outputRange?: unknown[];
  frameRange?: number[];
  config?: Record<string, unknown>;
}

export interface EditablePropInfo {
  editable: boolean;
  confidence: "high" | "low";
  staticValue: unknown;
}

export interface RegistryEntry {
  eid: string;
  elementType: string;
  label: string;
  isLoopItem: boolean;
  parentEid?: string;
  editableProps: Record<string, EditablePropInfo>;
  staticStyle: Record<string, unknown>;
  animatedProps: Record<string, AnimatedPropInfo>;
  nonEditable: string[];
  lowConfidence: string[];
  textType: "static" | "dynamic" | "animated" | "mixed" | "none";
  staticText?: string;
  assetType: "image" | "icon" | "none";
  staticSrc?: string;
  iconName?: string;
}

export interface TransformResult {
  transformedCode: string;
  registry: Record<string, RegistryEntry>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SKIP_ELEMENTS = new Set([
  "Sequence", "Series", "Loop", "Freeze", "OffthreadVideo",
]);

// ─── Preamble injected at top of every transformed module ────────────────────

const PREAMBLE = `
function __patch(eid, style) {
  var edit = (typeof window !== 'undefined' && window.__EDIT_STORE__) ? window.__EDIT_STORE__[eid] : null;
  if (!edit) return style;
  var patched = Object.assign({}, style, edit.style || {});
  if (edit.transform) {
    var tx = edit.transform.translateX || 0;
    var ty = edit.transform.translateY || 0;
    patched.transform = 'translate(' + tx + 'px, ' + ty + 'px) ' + (patched.transform || '');
  }
  return patched;
}
function __patchText(eid, original) {
  var _s = (typeof window !== 'undefined') ? window.__EDIT_STORE__ : null;
  return (_s && _s[eid] && _s[eid].text != null) ? _s[eid].text : original;
}
function __patchRange(eid, prop, defaultRange) {
  var _s = (typeof window !== 'undefined') ? window.__EDIT_STORE__ : null;
  return (_s && _s[eid] && _s[eid].ranges && _s[eid].ranges[prop]) ? _s[eid].ranges[prop] : defaultRange;
}
function __patchSpring(eid, prop, defaultConfig) {
  var _s = (typeof window !== 'undefined') ? window.__EDIT_STORE__ : null;
  var overrides = (_s && _s[eid] && _s[eid].springs && _s[eid].springs[prop]) ? _s[eid].springs[prop] : {};
  return Object.assign({}, defaultConfig, overrides);
}
function __patchAsset(eid, defaultSrc) {
  var _s = (typeof window !== 'undefined') ? window.__EDIT_STORE__ : null;
  return (_s && _s[eid] && _s[eid].asset) ? _s[eid].asset : defaultSrc;
}
function __patchIcon(eid, defaultEl) {
  var _s = (typeof window !== 'undefined') ? window.__EDIT_STORE__ : null;
  var iconName = _s ? (_s[eid] && _s[eid].icon) : null;
  if (!iconName) return defaultEl;
  var Icon = (typeof window !== 'undefined') ? (window.__ICON_REGISTRY__ && window.__ICON_REGISTRY__[iconName]) : null;
  if (!Icon) return defaultEl;
  return React.createElement(Icon, defaultEl.props);
}
`.trim();

// ─── Babel Transform Plugin ───────────────────────────────────────────────────

function createTransformPlugin(registry: Record<string, RegistryEntry>) {
  let counter = 0;
  // Cache variable maps per function node to avoid rebuilding on re-visit
  const varMapCache = new WeakMap<object, Map<string, VarEntry>>();

  return function plugin(babel: any) {
    const t = babel.types;

    // ── AST helpers ──────────────────────────────────────────────────────────

    function getElementName(nameNode: any): string {
      if (t.isJSXIdentifier(nameNode)) return nameNode.name as string;
      if (t.isJSXMemberExpression(nameNode)) return getElementName(nameNode.property);
      return "unknown";
    }

    function calleeNamed(node: any, name: string): boolean {
      if (!t.isCallExpression(node)) return false;
      return (
        t.isIdentifier(node.callee, { name }) ||
        (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property, { name }))
      );
    }

    function parseInterpolate(node: any): Extract<VarEntry, { type: "interpolate" }> {
      const frameRange: number[] =
        node.arguments[1]?.elements?.map((el: any) =>
          t.isNumericLiteral(el) ? el.value : 0,
        ) ?? [];
      const outputRange: unknown[] =
        node.arguments[2]?.elements?.map((el: any) =>
          t.isNumericLiteral(el) || t.isStringLiteral(el) ? el.value : el,
        ) ?? [];
      return { type: "interpolate", frameRange, outputRange, raw: node };
    }

    function parseSpring(node: any): Extract<VarEntry, { type: "spring" }> {
      const config: Record<string, unknown> = {};
      const argsObj = node.arguments[0];
      if (t.isObjectExpression(argsObj)) {
        const configProp = argsObj.properties.find(
          (p: any) => t.isObjectProperty(p) && t.isIdentifier(p.key, { name: "config" }),
        );
        if (configProp && t.isObjectExpression(configProp.value)) {
          for (const p of configProp.value.properties) {
            if (t.isObjectProperty(p) && !p.computed && t.isIdentifier(p.key)) {
              if (t.isNumericLiteral(p.value)) config[p.key.name] = p.value.value;
              else if (t.isStringLiteral(p.value)) config[p.key.name] = p.value.value;
            }
          }
        }
      }
      return { type: "spring", config, raw: node };
    }

    function classifyNode(initNode: any): VarEntry {
      if (calleeNamed(initNode, "interpolate")) return parseInterpolate(initNode);
      if (calleeNamed(initNode, "spring")) return parseSpring(initNode);
      if (t.isStringLiteral(initNode) || t.isNumericLiteral(initNode))
        return { type: "static", value: initNode.value, raw: initNode };
      if (
        t.isBinaryExpression(initNode) ||
        t.isUnaryExpression(initNode) ||
        t.isCallExpression(initNode)
      )
        return { type: "computed" };
      return { type: "unknown" };
    }

    // ── Variable map: declarations before first return ────────────────────────

    function buildVarMap(fnPath: any): Map<string, VarEntry> {
      const map = new Map<string, VarEntry>();
      const body = fnPath.node.body;
      if (!t.isBlockStatement(body)) return map;
      const stmts = body.body as any[];
      const returnIdx = stmts.findIndex((s: any) => t.isReturnStatement(s));
      const limit = returnIdx === -1 ? stmts.length : returnIdx;
      for (let i = 0; i < limit; i++) {
        const stmt = stmts[i];
        if (t.isVariableDeclaration(stmt)) {
          for (const decl of stmt.declarations) {
            if (t.isIdentifier(decl.id) && decl.init) {
              map.set(decl.id.name, classifyNode(decl.init));
            }
          }
        }
      }
      return map;
    }

    function getVarMap(path: any): Map<string, VarEntry> {
      const fnPath = path.findParent(
        (p: any) =>
          p.isFunctionDeclaration() ||
          p.isArrowFunctionExpression() ||
          p.isFunctionExpression(),
      );
      if (!fnPath) return new Map();
      if (varMapCache.has(fnPath.node)) return varMapCache.get(fnPath.node)!;
      const map = buildVarMap(fnPath);
      varMapCache.set(fnPath.node, map);
      return map;
    }

    // ── Loop detection ────────────────────────────────────────────────────────

    function getLoopCtx(path: any): { inLoop: boolean; indexParam: string | null } {
      let p = path.parentPath;
      while (p) {
        if (
          p.isCallExpression() &&
          t.isMemberExpression(p.node.callee) &&
          t.isIdentifier(p.node.callee.property, { name: "map" }) &&
          p.node.arguments.length > 0
        ) {
          const params: any[] = p.node.arguments[0]?.params ?? [];
          const indexParam: string = params[1]?.name ?? "i";
          return { inLoop: true, indexParam };
        }
        p = p.parentPath;
      }
      return { inLoop: false, indexParam: null };
    }

    // ── SVG ancestor check ────────────────────────────────────────────────────

    function hasSVGAncestor(path: any): boolean {
      let p = path.parentPath;
      while (p) {
        if (p.isJSXElement()) {
          if (getElementName(p.node.openingElement.name) === "svg") return true;
        }
        p = p.parentPath;
      }
      return false;
    }

    // ── EID node builders ─────────────────────────────────────────────────────

    // Static: t.stringLiteral("el-1")
    // Loop:   t.templateLiteral([`el-1-`, ``], [identifier])
    function buildEidNode(n: number, inLoop: boolean, indexParam: string | null): any {
      if (!inLoop || !indexParam) return t.stringLiteral(`el-${n}`);
      return t.templateLiteral(
        [
          t.templateElement({ raw: `el-${n}-`, cooked: `el-${n}-` }, false),
          t.templateElement({ raw: "", cooked: "" }, true),
        ],
        [t.identifier(indexParam)],
      );
    }

    // ── Style value wrapping ──────────────────────────────────────────────────

    // interpolate(frame, [0,30], [0,1])
    // → interpolate(frame, [0,30], __patchRange(eid, "prop", [0,1]))
    function wrapInterpolateRange(originalNode: any, eidNode: any, propName: string): any {
      if (!originalNode.arguments || originalNode.arguments.length < 3) return originalNode;
      return t.callExpression(t.cloneNode(originalNode.callee, true), [
        t.cloneNode(originalNode.arguments[0], true),
        t.cloneNode(originalNode.arguments[1], true),
        t.callExpression(t.identifier("__patchRange"), [
          eidNode,
          t.stringLiteral(propName),
          t.cloneNode(originalNode.arguments[2], true),
        ]),
      ]);
    }

    // spring({ frame, fps, config: { damping: 10 } })
    // → spring({ frame, fps, config: __patchSpring(eid, "prop", { damping: 10 }) })
    function wrapSpringConfig(originalNode: any, eidNode: any, propName: string): any {
      const argsObj = originalNode.arguments?.[0];
      if (!t.isObjectExpression(argsObj)) return originalNode;
      let hasConfig = false;
      const newProps = argsObj.properties.map((p: any) => {
        if (t.isObjectProperty(p) && !p.computed && t.isIdentifier(p.key, { name: "config" })) {
          hasConfig = true;
          return t.objectProperty(
            t.identifier("config"),
            t.callExpression(t.identifier("__patchSpring"), [
              eidNode,
              t.stringLiteral(propName),
              t.cloneNode(p.value, true),
            ]),
          );
        }
        return t.cloneNode(p, true);
      });
      if (!hasConfig) {
        newProps.push(
          t.objectProperty(
            t.identifier("config"),
            t.callExpression(t.identifier("__patchSpring"), [
              eidNode,
              t.stringLiteral(propName),
              t.objectExpression([]),
            ]),
          ),
        );
      }
      return t.callExpression(t.cloneNode(originalNode.callee, true), [
        t.objectExpression(newProps),
      ]);
    }

    function wrapStyleValue(
      eidNode: any,
      propName: string,
      valueNode: any,
      varMap: Map<string, VarEntry>,
      entry: RegistryEntry,
    ): any {
      // CASE 1 — inline string/number literal
      if (t.isStringLiteral(valueNode) || t.isNumericLiteral(valueNode)) {
        entry.staticStyle[propName] = valueNode.value;
        return valueNode;
      }

      // CASE 2 — identifier — look up in variable map
      if (t.isIdentifier(valueNode)) {
        const ve = varMap.get(valueNode.name);
        if (ve?.type === "interpolate") {
          entry.animatedProps[propName] = {
            type: "interpolate",
            outputRange: ve.outputRange,
            frameRange: ve.frameRange,
          };
          return wrapInterpolateRange(ve.raw, eidNode, propName);
        }
        if (ve?.type === "spring") {
          entry.animatedProps[propName] = { type: "spring", config: ve.config };
          return wrapSpringConfig(ve.raw, eidNode, propName);
        }
        if (ve?.type === "static") {
          entry.staticStyle[propName] = ve.value;
          return valueNode;
        }
        entry.nonEditable.push(propName);
        return valueNode;
      }

      // CASE 3 — inline interpolate call (LLM hallucination)
      if (calleeNamed(valueNode, "interpolate")) {
        const parsed = parseInterpolate(valueNode);
        entry.animatedProps[propName] = {
          type: "interpolate",
          outputRange: parsed.outputRange,
          frameRange: parsed.frameRange,
        };
        return wrapInterpolateRange(valueNode, eidNode, propName);
      }

      // CASE 4 — inline spring call (LLM hallucination)
      if (calleeNamed(valueNode, "spring")) {
        const parsed = parseSpring(valueNode);
        entry.animatedProps[propName] = { type: "spring", config: parsed.config };
        return wrapSpringConfig(valueNode, eidNode, propName);
      }

      // CASE 5 — ternary expression
      if (t.isConditionalExpression(valueNode)) {
        const fallback = valueNode.consequent;
        if (t.isStringLiteral(fallback) || t.isNumericLiteral(fallback)) {
          entry.staticStyle[propName] = fallback.value;
          entry.lowConfidence.push(propName);
        } else {
          entry.nonEditable.push(propName);
        }
        return valueNode; // leave ternary; __patch overrides at runtime
      }

      // CASE 6 — template literal (e.g. `scale(${scale})`)
      if (t.isTemplateLiteral(valueNode)) {
        entry.nonEditable.push(propName);
        return valueNode;
      }

      // CASE 7 — anything else
      entry.nonEditable.push(propName);
      return valueNode;
    }

    // Wrap entire style object: __patch(eid, { ...props })
    function wrapStyleObject(
      _eid: string,
      eidNode: any,
      styleExprNode: any,
      varMap: Map<string, VarEntry>,
      entry: RegistryEntry,
    ): any {
      if (!t.isObjectExpression(styleExprNode)) {
        // Non-object style (identifier, call, etc.) — blind wrap
        return t.callExpression(t.identifier("__patch"), [eidNode, styleExprNode]);
      }

      // Note spread elements — mark as low confidence
      for (const prop of styleExprNode.properties) {
        if (t.isSpreadElement(prop) || t.isRestElement(prop)) {
          entry.lowConfidence.push("*spread*");
        }
      }

      // Wrap each non-spread, non-computed property value
      for (const prop of styleExprNode.properties) {
        if (t.isObjectProperty(prop) && !prop.computed) {
          const propName: string = t.isIdentifier(prop.key)
            ? prop.key.name
            : String(prop.key.value ?? "");
          prop.value = wrapStyleValue(eidNode, propName, prop.value, varMap, entry);
        }
      }

      return t.callExpression(t.identifier("__patch"), [eidNode, styleExprNode]);
    }

    // ── Text children wrapping ────────────────────────────────────────────────

    function referencesAnimation(expr: any, varMap: Map<string, VarEntry>): boolean {
      if (t.isIdentifier(expr)) {
        const e = varMap.get(expr.name);
        return e?.type === "interpolate" || e?.type === "spring";
      }
      return calleeNamed(expr, "interpolate") || calleeNamed(expr, "spring");
    }

    function wrapTextChildren(
      children: any[],
      eidNode: any,
      varMap: Map<string, VarEntry>,
      entry: RegistryEntry,
    ): any[] {
      const meaningful = children.filter(
        (c) => !(t.isJSXText(c) && (c.value as string).trim() === ""),
      );

      if (meaningful.length !== 1) {
        entry.textType = meaningful.length > 1 ? "mixed" : "none";
        return children;
      }

      const child = meaningful[0];

      // Plain JSXText
      if (t.isJSXText(child)) {
        const text = (child.value as string).trim();
        if (text) {
          entry.textType = "static";
          entry.staticText = text;
          return [
            t.jsxExpressionContainer(
              t.callExpression(t.identifier("__patchText"), [eidNode, t.stringLiteral(text)]),
            ),
          ];
        }
        entry.textType = "none";
        return children;
      }

      // JSX expression container
      if (t.isJSXExpressionContainer(child)) {
        const expr = child.expression;

        if (t.isStringLiteral(expr) || t.isNumericLiteral(expr)) {
          const text = String(expr.value);
          entry.textType = "static";
          entry.staticText = text;
          return [
            t.jsxExpressionContainer(
              t.callExpression(t.identifier("__patchText"), [eidNode, t.stringLiteral(text)]),
            ),
          ];
        }

        if (t.isIdentifier(expr)) {
          const ve = varMap.get(expr.name);
          if (ve?.type === "static") {
            const text = String(ve.value);
            entry.textType = "static";
            entry.staticText = text;
            return [
              t.jsxExpressionContainer(
                t.callExpression(t.identifier("__patchText"), [eidNode, t.stringLiteral(text)]),
              ),
            ];
          }
          if (ve?.type === "interpolate" || ve?.type === "spring") {
            entry.textType = "animated";
            return children;
          }
        }

        if (referencesAnimation(expr, varMap)) {
          entry.textType = "animated";
          return children;
        }

        entry.textType = "dynamic";
        return children;
      }

      entry.textType = "dynamic";
      return children;
    }

    // ── Element-specific handlers ─────────────────────────────────────────────

    function handleImg(
      openingEl: any,
      eidNode: any,
      varMap: Map<string, VarEntry>,
      entry: RegistryEntry,
    ) {
      entry.assetType = "image";
      const srcAttr = openingEl.attributes.find(
        (a: any) => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name, { name: "src" }),
      );
      if (!srcAttr) return;

      let staticSrc: string | undefined;
      const val = srcAttr.value;
      if (t.isStringLiteral(val)) {
        staticSrc = val.value;
      } else if (t.isJSXExpressionContainer(val)) {
        const expr = val.expression;
        if (t.isStringLiteral(expr)) {
          staticSrc = expr.value;
        } else if (t.isIdentifier(expr)) {
          const ve = varMap.get(expr.name);
          if (ve?.type === "static") staticSrc = String(ve.value);
        }
      }
      if (staticSrc !== undefined) {
        entry.staticSrc = staticSrc;
        srcAttr.value = t.jsxExpressionContainer(
          t.callExpression(t.identifier("__patchAsset"), [eidNode, t.stringLiteral(staticSrc)]),
        );
      }
    }

    function handleStyleProp(
      openingEl: any,
      eid: string,
      eidNode: any,
      varMap: Map<string, VarEntry>,
      entry: RegistryEntry,
    ) {
      const styleAttr = openingEl.attributes.find(
        (a: any) => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name, { name: "style" }),
      );
      if (!styleAttr || !t.isJSXExpressionContainer(styleAttr.value)) return;

      const wrapped = wrapStyleObject(eid, eidNode, styleAttr.value.expression, varMap, entry);
      styleAttr.value = t.jsxExpressionContainer(wrapped);
    }

    // ── Main visitor ──────────────────────────────────────────────────────────

    return {
      visitor: {
        JSXElement(path: any) {
          const openingEl = path.node.openingElement;
          const elementName = getElementName(openingEl.name);

          // Skip non-visual Remotion primitives (but still visit their children)
          if (SKIP_ELEMENTS.has(elementName)) return;

          // Skip SVG internals — only instrument the SVG wrapper itself
          if (hasSVGAncestor(path) && elementName !== "svg") return;

          const varMap = getVarMap(path);
          const { inLoop, indexParam } = getLoopCtx(path);

          const n = ++counter;
          const eid = `el-${n}`;
          const eidNode = buildEidNode(n, inLoop, indexParam);

          const entry: RegistryEntry = {
            eid: inLoop && indexParam ? `el-${n}-\${${indexParam}}` : eid,
            elementType: elementName,
            label: `${elementName} #${n}`,
            isLoopItem: inLoop,
            editableProps: {},
            staticStyle: {},
            animatedProps: {},
            nonEditable: [],
            lowConfidence: [],
            textType: "none",
            assetType: "none",
          };

          // Inject data-eid attribute
          const eidAttr = t.jsxAttribute(
            t.jsxIdentifier("data-eid"),
            inLoop && indexParam
              ? t.jsxExpressionContainer(eidNode)
              : t.stringLiteral(eid),
          );
          openingEl.attributes.unshift(eidAttr);

          // Route to element-specific handler
          if (elementName === "img" || elementName === "Img") {
            handleImg(openingEl, eidNode, varMap, entry);
          } else {
            handleStyleProp(openingEl, eid, eidNode, varMap, entry);
            const newChildren = wrapTextChildren(
              path.node.children,
              eidNode,
              varMap,
              entry,
            );
            if (newChildren !== path.node.children) {
              path.node.children = newChildren;
            }
          }

          // Build editableProps summary from staticStyle + animatedProps
          for (const [prop, val] of Object.entries(entry.staticStyle)) {
            entry.editableProps[prop] = {
              editable: true,
              confidence: entry.lowConfidence.includes(prop) ? "low" : "high",
              staticValue: val,
            };
          }
          for (const [prop] of Object.entries(entry.animatedProps)) {
            entry.editableProps[prop] = {
              editable: true,
              confidence: "high",
              staticValue: undefined,
            };
          }
          for (const prop of entry.nonEditable) {
            entry.editableProps[prop] = {
              editable: false,
              confidence: "high",
              staticValue: undefined,
            };
          }

          registry[eid] = entry;
        },
      },
    };
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Instrument LLM-generated Remotion JSX code with the editing layer.
 *
 * Input:  raw JSX/TSX code as produced by the LLM (may contain import statements)
 * Output:
 *   - transformedCode: same code with preamble + data-eid / __patch / __patchText
 *                      / __patchRange / __patchAsset injected
 *   - registry:        map of eid → RegistryEntry describing each instrumented element
 */
export function transformAnimation(code: string): TransformResult {
  const registry: Record<string, RegistryEntry> = {};

  try {
    const result = Babel.transform(code, {
      presets: ["react", "typescript"],
      plugins: [createTransformPlugin(registry)],
      filename: "animation.tsx",
      sourceType: "module",
    } as any);

    if (!result?.code) {
      return { transformedCode: code, registry };
    }

    const transformedCode = PREAMBLE + "\n" + result.code;
    return { transformedCode, registry };
  } catch (err) {
    console.error("[ast-transform] Transform failed:", err);
    return { transformedCode: code, registry };
  }
}
