import * as Babel from "@babel/standalone";
import { VarEntry, RegistryEntry, TransformResult } from "./types/ast";

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
function __patchVar(eid, key, defaultValue) {
  var _s = (typeof window !== 'undefined') ? window.__EDIT_STORE__ : null;
  if (!_s || !_s[eid]) return defaultValue;
  if (key === 'text' && _s[eid].text != null) return _s[eid].text;
  if (_s[eid].style && _s[eid].style[key] != null) return _s[eid].style[key];
  return defaultValue;
}
function __patchWords(eid, defaultWords) {
  var _s = (typeof window !== 'undefined') ? window.__EDIT_STORE__ : null;
  return (_s && _s[eid] && _s[eid].words) ? _s[eid].words : defaultWords;
}
`.trim()

// ─── Babel Transform Plugin ───────────────────────────────────────────────────
function createConstRewritePlugin(registry: Record<string, RegistryEntry>) {
  return function plugin(babel: any) {
    const t = babel.types

    function findOwnerEid(varName: string): string | null {
      for (const [eid, entry] of Object.entries(registry)) {
        if (entry.sourceVar === varName) return eid
      }
      return null
    }

    function resolveVarKey(varName: string, eid: string): string {
      const entry = registry[eid]

      // sourceVar on letter-cascade or typewriter → always the text key
      if (
        entry?.textType === 'letter-cascade' ||
        entry?.textType === 'typewriter'
      ) return 'text'

      // Map ALL_CAPS const name → CSS prop name
      const propMap: Record<string, string> = {
        TEXT_COLOR:        'color',
        TEXT_FONT_SIZE:    'fontSize',
        TEXT_FONT_FAMILY:  'fontFamily',
        TEXT_FONT_WEIGHT:  'fontWeight',
        TEXT_SHADOW:       'textShadow',
        BACKGROUND_COLOR:  'background',
        ACCENT_COLOR:      'color',
      }

      return propMap[varName] ?? varName.toLowerCase()
    }

    return {
      visitor: {
        VariableDeclarator(path: any) {
          if (!t.isIdentifier(path.node.id)) return
          const name = path.node.id.name as string

          // Only ALL_CAPS identifiers — template var convention
          if (!/^[A-Z][A-Z0-9_]*$/.test(name)) return
          if (!path.node.init) return

          // Don't double-wrap if already patched
          if (
            t.isCallExpression(path.node.init) &&
            t.isIdentifier(path.node.init.callee) &&
            (
              path.node.init.callee.name === '__patchVar' ||
              path.node.init.callee.name === '__patchWords'
            )
          ) return

          // Case 1 — var is the sourceVar of a registry entry
          const ownerEid = findOwnerEid(name)
          if (ownerEid) {
            const key = resolveVarKey(name, ownerEid)
            console.log(`[constRewrite] ${name} → __patchVar('${ownerEid}', '${key}', ...)`)
            path.node.init = t.callExpression(
              t.identifier('__patchVar'),
              [
                t.stringLiteral(ownerEid),
                t.stringLiteral(key),
                t.cloneNode(path.node.init, true),
              ]
            )
            return
          }

          // Case 2 — var is sourceVar of a word-cycle entry
          const wordEntry = Object.entries(registry).find(
            ([, e]) => e.textType === 'word-cycle' && e.sourceVar === name
          )
          if (wordEntry) {
            const [wordEid] = wordEntry
            console.log(`[constRewrite] ${name} → __patchWords('${wordEid}', ...)`)
            path.node.init = t.callExpression(
              t.identifier('__patchWords'),
              [
                t.stringLiteral(wordEid),
                t.cloneNode(path.node.init, true),
              ]
            )
            return
          }

          // Case 3 — var referenced in staticStyle of any registry entry
          // e.g. TEXT_COLOR used in el-3 style → wrap with __patchVar
          const styleEntry = Object.entries(registry).find(([, e]) => {
            const key = resolveVarKey(name, '')
            return e.staticStyle && key in e.staticStyle &&
              String(e.staticStyle[key as keyof typeof e.staticStyle]) ===
              String(getInitValue(path.node.init, t))
          })

          if (styleEntry) {
            const [styleEid] = styleEntry
            const key = resolveVarKey(name, styleEid)
            console.log(`[constRewrite] ${name} → __patchVar('${styleEid}', '${key}', ...) via staticStyle match`)
            path.node.init = t.callExpression(
              t.identifier('__patchVar'),
              [
                t.stringLiteral(styleEid),
                t.stringLiteral(key),
                t.cloneNode(path.node.init, true),
              ]
            )
          }
        }
      }
    }
  }
}

// Helper — extract primitive value from an init node for matching
function getInitValue(node: any, t: any): string | number | null {
  if (t.isStringLiteral(node)) return node.value
  if (t.isNumericLiteral(node)) return node.value
  return null
}

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

    function classifyNode(initNode: any, varMap?: Map<string, VarEntry>): VarEntry {
      // Existing — interpolate
      if (calleeNamed(initNode, "interpolate")) return parseInterpolate(initNode)
      // Existing — spring
      if (calleeNamed(initNode, "spring")) return parseSpring(initNode)
      // Existing — string/number literal
      if (t.isStringLiteral(initNode) || t.isNumericLiteral(initNode))
        return { type: "static", value: initNode.value, raw: initNode }

      // NEW — identifier reference → resolve through varMap
      if (t.isIdentifier(initNode) && varMap) {
        const ref = varMap.get(initNode.name)
        if (ref?.type === "static") return { type: "static", value: ref.value, raw: initNode }
        if (ref?.type === "static-array") return ref
        if (ref) return ref
      }

      // NEW — array of literals → static-array
      if (t.isArrayExpression(initNode)) {
        const els = initNode.elements
        if (els.length > 0 && els.every((el: any) => t.isStringLiteral(el) || t.isNumericLiteral(el))) {
          return {
            type: "static-array",
            value: els.map((el: any) => el.value),
            raw: initNode,
          }
        }
      }

      // NEW — counter: Math.round(interpolate(x, range, [staticNum, staticNum]))
      if (varMap) {
        const counter = detectCounter(initNode, varMap)
        if (counter) return counter
      }

      // NEW — typewriter: someString.slice(0, n) or .substring(0, n)
      if (varMap) {
        const tw = detectTypewriter(initNode, varMap)
        if (tw) return tw
      }

      // NEW — word-cycle: someArray[frameBasedIndex]
      if (varMap) {
        const wc = detectWordCycle(initNode, varMap)
        if (wc) return wc
      }

      // NEW — letter-cascade: someString.split('')
      if (varMap) {
        const lc = detectLetterCascade(initNode, varMap)
        if (lc) return lc
      }

      // Existing fallbacks
      if (
        t.isBinaryExpression(initNode) ||
        t.isUnaryExpression(initNode) ||
        t.isCallExpression(initNode)
      )
        return { type: "computed" }

      return { type: "unknown" }
    }

    function resolveStaticNumber(node: any, varMap: Map<string, VarEntry>): number | null {
      if (t.isNumericLiteral(node)) return node.value
      if (t.isIdentifier(node)) {
        const e = varMap.get(node.name)
        if (e?.type === "static" && typeof e.value === "number") return e.value
      }
      return null
    }

    function referencesFrame(node: any): boolean {
      if (t.isIdentifier(node) && node.name === "frame") return true
      if (t.isBinaryExpression(node))
        return referencesFrame(node.left) || referencesFrame(node.right)
      if (t.isCallExpression(node))
        return node.arguments.some((a: any) => referencesFrame(a))
      if (t.isMemberExpression(node))
        return referencesFrame(node.object) || referencesFrame(node.property)
      return false
    }

    // Math.round(interpolate(progress, [0,1], [staticNum, staticNum]))
    function detectCounter(initNode: any, varMap: Map<string, VarEntry>): VarEntry | null {
      let interp = null
      let isRounded = false

      // Math.round(interpolate(...))
      if (
        t.isCallExpression(initNode) &&
        t.isMemberExpression(initNode.callee) &&
        t.isIdentifier(initNode.callee.property, { name: "round" }) &&
        initNode.arguments.length === 1 &&
        calleeNamed(initNode.arguments[0], "interpolate")
      ) {
        interp = initNode.arguments[0]
        isRounded = true
      }

      // bare interpolate(...)
      if (!interp && calleeNamed(initNode, "interpolate")) {
        interp = initNode
      }

      if (!interp || interp.arguments.length < 3) return null

      const outputRange = interp.arguments[2]
      if (!t.isArrayExpression(outputRange) || outputRange.elements.length !== 2) return null

      const fromVal = resolveStaticNumber(outputRange.elements[0], varMap)
      const toVal = resolveStaticNumber(outputRange.elements[1], varMap)

      if (fromVal === null || toVal === null) return null
      if (Math.abs(toVal - fromVal) <= 1) return null  // not a counter — too small a range

      return {
        type: "counter",
        startValue: fromVal,
        endValue: toVal,
        isRounded,
        raw: initNode,
      }
    }

    // someString.slice(0, n) or .substring(0, n)
    function detectTypewriter(initNode: any, varMap: Map<string, VarEntry>): VarEntry | null {
      if (!t.isCallExpression(initNode)) return null
      if (!t.isMemberExpression(initNode.callee)) return null

      const method = initNode.callee.property?.name
      if (method !== "slice" && method !== "substring") return null

      const obj = initNode.callee.object
      if (!t.isIdentifier(obj)) return null

      const ref = varMap.get(obj.name)
      if (ref?.type !== "static" || typeof ref.value !== "string") return null

      // Second arg must be dynamic (references frame or a computed value)
      const endArg = initNode.arguments[1]
      if (!endArg) return null

      return {
        type: "typewriter",
        sourceVar: obj.name,
        sourceText: ref.value as string,
        raw: initNode,
      }
    }

    // someArray[frameBasedIndex]
    function detectWordCycle(initNode: any, varMap: Map<string, VarEntry>): VarEntry | null {
      if (!t.isMemberExpression(initNode)) return null
      if (!initNode.computed) return null

      const obj = initNode.object
      if (!t.isIdentifier(obj)) return null

      const ref = varMap.get(obj.name)
      if (ref?.type !== "static-array") return null
      if (!ref.value.every((v: any) => typeof v === "string")) return null

      const key = initNode.property
      if (!referencesFrame(key)) {
        // Key might be an intermediate variable like wordIndex
        if (t.isIdentifier(key)) {
          const keyRef = varMap.get(key.name)
          if (!keyRef || keyRef.type === "static") return null
          // computed or unknown that may reference frame — accept it
        }
      }

      return {
        type: "word-cycle",
        sourceVar: obj.name,
        words: ref.value as string[],
        raw: initNode,
      }
    }

    // someString.split('')
    function detectLetterCascade(initNode: any, varMap: Map<string, VarEntry>): VarEntry | null {
      if (!t.isCallExpression(initNode)) return null
      if (!t.isMemberExpression(initNode.callee)) return null
      if (initNode.callee.property?.name !== "split") return null

      const arg = initNode.arguments[0]
      if (!t.isStringLiteral(arg) || arg.value !== "") return null

      const obj = initNode.callee.object
      if (!t.isIdentifier(obj)) return null

      const ref = varMap.get(obj.name)
      if (ref?.type !== "static" || typeof ref.value !== "string") return null

      return {
        type: "letter-cascade",
        sourceVar: obj.name,
        sourceText: ref.value as string,
        raw: initNode,
      }
    }

    // ── Variable map: declarations before first return ────────────────────────

    function buildVarMap(fnPath: any): Map<string, VarEntry> {
      const map = new Map<string, VarEntry>()

      // ── Pass 1: module-level consts (ALL_CAPS template vars) ─────────────────
      // Walk up to Program node and scan top-level declarations
      const programPath = fnPath.findParent((p: any) => p.isProgram())
      if (programPath) {
        for (const stmt of programPath.node.body) {
          if (t.isVariableDeclaration(stmt)) {
            for (const decl of stmt.declarations) {
              if (t.isIdentifier(decl.id) && decl.init) {
                const name = decl.id.name as string
                // Only scan ALL_CAPS names — template variables
                // avoids polluting map with component imports etc
                if (/^[A-Z][A-Z0-9_]*$/.test(name)) {
                  map.set(name, classifyNode(decl.init, map))
                }
              }
            }
          }
        }
      }

      // ── Pass 2: component body declarations before return ────────────────────
      const body = fnPath.node.body
      if (!t.isBlockStatement(body)) return map
      const stmts = body.body as any[]
      const returnIdx = stmts.findIndex((s: any) => t.isReturnStatement(s))
      const limit = returnIdx === -1 ? stmts.length : returnIdx
      for (let i = 0; i < limit; i++) {
        const stmt = stmts[i]
        if (t.isVariableDeclaration(stmt)) {
          for (const decl of stmt.declarations) {
            if (t.isIdentifier(decl.id) && decl.init) {
              map.set(decl.id.name, classifyNode(decl.init, map))
            }
          }
        }
      }

      return map
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
      )

      if (meaningful.length !== 1) {
        entry.textType = meaningful.length > 1 ? "mixed" : "none"
        return children
      }



      const child = meaningful[0]

      // JSX element child — not text at all
      if (t.isJSXElement(child) || t.isJSXFragment(child)) {
        entry.textType = "none"
        return children
      }

      // Plain JSXText — existing
      if (t.isJSXText(child)) {
        const text = (child.value as string).trim()
        if (text) {
          entry.textType = "static"
          entry.staticText = text
          return [
            t.jsxExpressionContainer(
              t.callExpression(t.identifier("__patchText"), [eidNode, t.stringLiteral(text)]),
            ),
          ]
        }
        entry.textType = "none"
        return children
      }

      if (t.isJSXExpressionContainer(child)) {
        const expr = child.expression

        // String/number literal — existing
        if (t.isStringLiteral(expr) || t.isNumericLiteral(expr)) {
          const text = String(expr.value)
          entry.textType = "static"
          entry.staticText = text
          return [
            t.jsxExpressionContainer(
              t.callExpression(t.identifier("__patchText"), [eidNode, t.stringLiteral(text)]),
            ),
          ]
        }

        if (t.isIdentifier(expr)) {
          const ve = varMap.get(expr.name)

          // Existing — static
          if (ve?.type === "static") {
            const text = String(ve.value)
            entry.textType = "static"
            entry.staticText = text
            return [
              t.jsxExpressionContainer(
                t.callExpression(t.identifier("__patchText"), [eidNode, t.stringLiteral(text)]),
              ),
            ]
          }

          // Existing — interpolate/spring
          if (ve?.type === "interpolate" || ve?.type === "spring") {
            entry.textType = "animated"
            return children
          }

          // NEW — counter
          if (ve?.type === "counter") {
            entry.textType = "counter"
            entry.counterStart = ve.startValue
            entry.counterEnd = ve.endValue
            entry.isRounded = ve.isRounded
            return children   // leave unchanged — __patchVar handles via const rewrite
          }

          // NEW — typewriter
          if (ve?.type === "typewriter") {
            entry.textType = "typewriter"
            entry.sourceText = ve.sourceText
            entry.sourceVar = ve.sourceVar
            return children   // const rewrite handles patching
          }

          // NEW — word-cycle
          if (ve?.type === "word-cycle") {
            entry.textType = "word-cycle"
            entry.words = ve.words
            entry.sourceVar = ve.sourceVar
            return children
          }
        }

        // NEW — letter-cascade: {letters.map(...)} where letters is letter-cascade type
        if (t.isCallExpression(expr) &&
          t.isMemberExpression(expr.callee) &&
          t.isIdentifier(expr.callee.property, { name: "map" })) {
          const obj = expr.callee.object
          if (t.isIdentifier(obj)) {
            const ve = varMap.get(obj.name)
            if (ve?.type === "letter-cascade") {
              entry.textType = "letter-cascade"
              entry.sourceText = ve.sourceText
              entry.sourceVar = ve.sourceVar
              return children
            }
          }
        }

        if (referencesAnimation(expr, varMap)) {
          entry.textType = "animated"
          return children
        }

        entry.textType = "dynamic"
        return children
      }

      entry.textType = "dynamic"
      return children
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
            // Also patch style so width/height edits are applied via __patch
            handleStyleProp(openingEl, eid, eidNode, varMap, entry);
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

// ─── Duration computation ─────────────────────────────────────────────────────

const ANIMATION_PRIMITIVES = new Set([
  'FadeIn', 'FadeOut', 'SlideIn', 'SlideOut', 'ScaleIn', 'ScaleOut',
  'Counter', 'Typewriter', 'WordCycle',
]);

const DURATION_DEFAULTS = {
  startAt: 0,
  durationInFrames: 30,
  staggerDelay: 12,
};

const TAIL_BUFFER = 20;

/**
 * Statically estimate the total duration (in frames) of LLM-generated animation code.
 *
 * Walk the JSX AST to find every animation primitive and read its `startAt` +
 * `durationInFrames` numeric props. `Stagger` is handled specially: its
 * `startAt` + (childIndex × staggerDelay) + childDuration is propagated to
 * each direct JSX-element child.
 *
 * Returns  max(endFrame across all primitives) + TAIL_BUFFER (20 frames).
 * Falls back to 150 if the code cannot be parsed or contains no primitives.
 */
export function computeAnimationDuration(code: string): number {
  const endFrames: number[] = [];

  function numericAttr(attrs: any[], name: string, t: any): number | null {
    const attr = attrs.find(
      (a: any) => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name, { name }),
    );
    if (!attr) return null;
    const val = attr.value;
    if (t.isJSXExpressionContainer(val) && t.isNumericLiteral(val.expression))
      return val.expression.value;
    if (t.isNumericLiteral(val)) return val.value;
    return null;
  }

  function jsxElementChildren(node: any, t: any): any[] {
    return node.children.filter((c: any) => t.isJSXElement(c));
  }

  try {
    Babel.transform(code, {
      presets: ['react', 'typescript'],
      plugins: [
        function durationPlugin(babel: any) {
          const t = babel.types;
          return {
            visitor: {
              JSXElement(path: any) {
                const openingEl = path.node.openingElement;
                const name: string =
                  t.isJSXIdentifier(openingEl.name) ? openingEl.name.name : '';
                const attrs = openingEl.attributes;

                if (ANIMATION_PRIMITIVES.has(name)) {
                  const startAt =
                    numericAttr(attrs, 'startAt', t) ?? DURATION_DEFAULTS.startAt;
                  const duration =
                    numericAttr(attrs, 'durationInFrames', t) ?? DURATION_DEFAULTS.durationInFrames;
                  endFrames.push(startAt + duration);
                  return;
                }

                if (name === 'Stagger') {
                  const staggerStart =
                    numericAttr(attrs, 'startAt', t) ?? DURATION_DEFAULTS.startAt;
                  const staggerDelay =
                    numericAttr(attrs, 'staggerDelay', t) ?? DURATION_DEFAULTS.staggerDelay;
                  const children = jsxElementChildren(path.node, t);
                  children.forEach((child: any, i: number) => {
                    const childName: string =
                      t.isJSXIdentifier(child.openingElement.name)
                        ? child.openingElement.name.name
                        : '';
                    if (!ANIMATION_PRIMITIVES.has(childName)) return;
                    const childDuration =
                      numericAttr(child.openingElement.attributes, 'durationInFrames', t) ??
                      DURATION_DEFAULTS.durationInFrames;
                    endFrames.push(staggerStart + i * staggerDelay + childDuration);
                  });
                  // skip default child-visiting so each child isn't also counted
                  // with startAt=0 (which would still be dominated by the values above)
                }
              },
            },
          };
        },
      ],
      filename: 'animation.tsx',
      sourceType: 'module',
    } as any);
  } catch {
    return 150;
  }

  if (endFrames.length === 0) return 150;
  return Math.max(...endFrames) + TAIL_BUFFER;
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
  const registry: Record<string, RegistryEntry> = {}

  try {
    // ── Pass 1: JSX instrumentation — builds registry ──────────────────────
    const pass1 = Babel.transform(code, {
      presets: ['react', 'typescript'],
      plugins: [createTransformPlugin(registry)],
      filename: 'animation.tsx',
      sourceType: 'module',
    } as any)

    if (!pass1?.code) return { transformedCode: code, registry }

    // Debug — confirm registry is populated before pass 2
    console.log('[transform] registry after pass1:',
      Object.entries(registry).map(([eid, e]) => 
        `${eid} textType=${e.textType} sourceVar=${e.sourceVar ?? '—'}`
      )
    )

    // ── Pass 2: const rewrite — uses completed registry ────────────────────
    const pass2 = Babel.transform(pass1.code, {
      plugins: [createConstRewritePlugin(registry)],
      filename: 'animation.js',
      sourceType: 'module',
    } as any)

    if (!pass2?.code) {
      // Pass 2 failed — still return pass 1 result, edits just won't apply to consts
      console.warn('[transform] Pass 2 failed — const rewrite skipped')
      return { transformedCode: PREAMBLE + '\n' + pass1.code, registry }
    }

    console.log('[transform] pass2 snippet:', pass2.code.slice(0, 400))

    const transformedCode = PREAMBLE + '\n' + pass2.code
    return { transformedCode, registry }

  } catch (err) {
    console.error('[ast-transform] Transform failed:', err)
    return { transformedCode: code, registry }
  }
}
