# Remotion Visual Editor
## Implementation Specification
*LLM-Generated Animation Editing Layer*

---

# 1. Overview & Design Philosophy

This document specifies the architecture and implementation of a visual editing layer for LLM-generated Remotion animations. The system allows users to click elements in a live animation preview, modify their properties via a panel, and persist those edits — all without touching the LLM again.

### Core Principles

- **LLM responsibility:** Generate correct, working Remotion JSX code only. Zero awareness of the editing layer.
- **Your pipeline responsibility:** Instrument, register, patch — all via post-processing.
- **Graceful degradation:** The editing layer always works. The property panel degrades gracefully when static values cannot be inferred.
- **Future expandable:** New patch primitives (opacity ranges, spring configs) are purely additive. No redesign needed.

> **KEY:** LLM generates code. You do everything else. The LLM should never know the editing layer exists.

---

# 2. System Architecture

### End-to-End Pipeline

```
LLM Output (clean JSX)
      │
      ▼
AST Transform Service (Node.js / TypeScript)
  ├── Pre-pass: build variable map from all declarations
  ├── JSX traversal: inject data-eid on every element
  ├── Style wrapping: __patch() / __patchRange() / __patchAsset()
  ├── Text wrapping: __patchText() on static string children
  └── Registry extraction: eid → { type, editableProps, staticValues }
      │
      ├──► Transformed code  (to JIT compiler)
      └──► Registry JSON     (to frontend)
                │
                ▼
      JIT Compile + Remotion Player
                │
      ┌─────────┴──────────┐
      ▼                    ▼
  DOM scan              __patch() reads
  → overlay             window.__EDIT_STORE__
  → click detection     → re-render on change
```

### Service Boundaries

| Service | Responsibility | Notes |
|---|---|---|
| `Go Backend` | LLM calls, auth, storage, project API, edit persistence | Calls transform service via HTTP |
| `Node.js Transform Service` | AST parsing, instrumentation, registry extraction | Stateless — scale to zero |
| `Frontend` | Overlay, click detection, property panel, edit store | Reads registry, writes __EDIT_STORE__ |

---

# 3. LLM Code Style Constraints

Add these rules to the LLM system prompt. They constrain code organisation only — not animation capability. The LLM retains full freedom over timing, sequencing, and visual design.

### Required Structure

```jsx
function Animation() {
  // BLOCK 1: Remotion hooks — always first
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // BLOCK 2: All computed values as named constants
  //   — one variable per animated prop
  //   — declared directly above return, never inside JSX
  const DURATION = 5;
  const opacity   = interpolate(frame, [0, 30], [0, 1]);
  const scale     = spring({ frame, fps, config: { damping: 10 } });
  const cardColor = "#4f46e5";

  // BLOCK 3: Single return, all styles inline
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <div style={{ opacity, color: cardColor, fontSize: 48 }}>
        Hello World
      </div>
    </AbsoluteFill>
  );
}
```

### Explicit Rules for System Prompt

1. All styles must be inline object literals directly on the JSX element. Never use style variables, getStyle() functions, or spread operators in styles.
2. Animated values (`interpolate`, `spring`) must be declared as named constants above the return. Never inline animation calls inside style objects.
3. Text children must be plain string literals only. No template literals, ternaries, or expressions as text.
4. Icons must be the sole child of a wrapper div. No siblings.
5. Images must use `<img src="...">` — never `background-image` in styles.
6. Exactly one return statement. No early returns, no conditional returns.
7. Loop items use `.map()` with an index parameter `i` always present, even if unused.

> **NOTE:** These constraints eliminate ~80% of edge cases before the AST transform runs. The transform then handles the remaining hallucination patterns as fallbacks.

---

# 4. AST Transform Service

Written in TypeScript using Babel. Exposed as a stateless HTTP service. Called by the Go backend after each LLM code generation.

## 4.1 Pre-Pass: Variable Map

Before touching JSX, walk all variable declarations above the return statement and build a lookup map. This is what makes the transform robust against LLM hallucinations.

```typescript
type VarEntry =
  | { type: "interpolate"; frameRange: number[]; outputRange: any[]; raw: Node }
  | { type: "spring";      config: Record<string, any>;              raw: Node }
  | { type: "static";      value: string | number;                   raw: Node }
  | { type: "computed" }   // e.g. width * 0.3 — not statically knowable
  | { type: "unknown" }    // anything else

function buildVariableMap(ast): Map<string, VarEntry> {
  const map = new Map();
  // walk all VariableDeclarators before the ReturnStatement
  forEachDeclarationBeforeReturn(ast, (name, initNode) => {
    if (isInterpolateCall(initNode))  map.set(name, parseInterpolate(initNode));
    else if (isSpringCall(initNode))  map.set(name, parseSpring(initNode));
    else if (isStringLiteral(initNode) || isNumericLiteral(initNode))
      map.set(name, { type: "static", value: initNode.value, raw: initNode });
    else if (isSimpleBinaryExpr(initNode)) map.set(name, { type: "computed" });
    else map.set(name, { type: "unknown" });
  });
  return map;
}
```

## 4.2 EID Generation

Every JSX element that could be visually selectable gets a `data-eid`. Generation rules:

```typescript
function generateEid(node, counter, isInLoop, loopIndexParam): string {
  if (isInLoop) {
    // Use template literal with loop index for stable per-item IDs
    // e.g. el-7-${i}  where i is the actual loop variable name
    return `el-${counter}-\${${loopIndexParam}}`;  // becomes runtime template
  }
  return `el-${counter}`;
}

// Loop detection: walk ancestors looking for:
//   CallExpression where callee is MemberExpression with property "map"
function isInMapLoop(path): { inLoop: boolean; indexParam: string | null } {
  let ancestor = path.parentPath;
  while (ancestor) {
    if (isMapCallExpression(ancestor.node)) {
      const params = ancestor.node.arguments[0]?.params ?? [];
      const indexParam = params[1]?.name ?? "i";
      return { inLoop: true, indexParam };
    }
    ancestor = ancestor.parentPath;
  }
  return { inLoop: false, indexParam: null };
}
```

## 4.3 Style Value Classification & Wrapping

For each property in a style object, classify the value and wrap accordingly. This is the waterfall that handles all cases including LLM hallucinations:

```typescript
function wrapStyleValue(eid, propName, valueNode, varMap): Node {

  // CASE 1 — inline string/number literal
  //   style={{ color: "#fff", fontSize: 48 }}
  if (isStringLiteral(valueNode) || isNumericLiteral(valueNode)) {
    registry[eid].staticStyle[propName] = valueNode.value;
    return valueNode; // __patch wraps the whole object, not individual values
  }

  // CASE 2 — identifier — look up in variable map
  //   style={{ opacity }}  or  style={{ opacity: opacityVar }}
  if (isIdentifier(valueNode)) {
    const entry = varMap.get(valueNode.name);
    if (entry?.type === "interpolate") {
      registry[eid].animatedProps[propName] = { type: "interpolate", ...entry };
      return buildPatchRangeCall(eid, propName, entry.outputRange);
      // __patchRange("el-1", "opacity", [0, 1])
    }
    if (entry?.type === "spring") {
      registry[eid].animatedProps[propName] = { type: "spring", ...entry };
      return buildPatchSpringCall(eid, propName, entry.config);
    }
    if (entry?.type === "static") {
      registry[eid].staticStyle[propName] = entry.value;
      return valueNode; // resolved statically, __patch covers it
    }
    // computed or unknown — pass through, mark as non-editable
    registry[eid].nonEditable.push(propName);
    return valueNode;
  }

  // CASE 3 — inline interpolate call (LLM hallucination)
  //   style={{ opacity: interpolate(frame, [0,30], [0,1]) }}
  if (isInterpolateCall(valueNode)) {
    const entry = parseInterpolate(valueNode);
    registry[eid].animatedProps[propName] = { type: "interpolate", ...entry };
    return buildPatchRangeCall(eid, propName, entry.outputRange);
  }

  // CASE 4 — inline spring call (LLM hallucination)
  if (isSpringCall(valueNode)) {
    const entry = parseSpring(valueNode);
    registry[eid].animatedProps[propName] = { type: "spring", ...entry };
    return buildPatchSpringCall(eid, propName, entry.config);
  }

  // CASE 5 — ternary expression (LLM hallucination)
  //   style={{ color: isActive ? "#fff" : "#000" }}
  if (isTernary(valueNode)) {
    const fallback = valueNode.consequent;
    if (isStringLiteral(fallback) || isNumericLiteral(fallback)) {
      registry[eid].staticStyle[propName] = fallback.value;
      registry[eid].lowConfidence.push(propName); // UI shows warning
    } else {
      registry[eid].nonEditable.push(propName);
    }
    return valueNode; // leave ternary as-is, __patch overrides at runtime
  }

  // CASE 6 — template literal (e.g. `scale(${scale})`) — leave alone
  if (isTemplateLiteral(valueNode)) {
    registry[eid].nonEditable.push(propName);
    return valueNode;
  }

  // CASE 7 — anything else — pass through, mark non-editable
  registry[eid].nonEditable.push(propName);
  return valueNode;
}
```

## 4.4 Style Object Wrapping

After classifying individual values, wrap the entire style object with `__patch`:

```typescript
// The entire style object becomes:
//   style={__patch("el-1", { color: "#fff", opacity: __patchRange(...) })}

function wrapStyleObject(eid, styleObjectNode, varMap): Node {
  // Handle spread: style={{ ...baseStyle, color: "#fff" }}
  if (hasSpreadElement(styleObjectNode)) {
    const spreadName = getSpreadIdentifier(styleObjectNode);
    const resolvedSpread = varMap.get(spreadName);
    if (resolvedSpread?.type === "static" && isObject(resolvedSpread.value)) {
      // Merge known spread into registry as static (lower confidence)
      Object.entries(resolvedSpread.value).forEach(([k, v]) => {
        registry[eid].staticStyle[k] = v;
        registry[eid].lowConfidence.push(k);
      });
    }
    // Wrap non-spread props normally, spread remains in object
  }

  // Wrap each property value
  styleObjectNode.properties.forEach(prop => {
    if (isObjectProperty(prop)) {
      prop.value = wrapStyleValue(eid, prop.key.name, prop.value, varMap);
    }
  });

  // Wrap entire object with __patch
  return buildPatchCall(eid, styleObjectNode);
  // → __patch("el-1", { ...styleObject })
}
```

## 4.5 Text Child Classification & Wrapping

```typescript
function classifyAndWrapChildren(eid, children, varMap) {
  if (children.length !== 1) {
    // Multiple children — too complex, mark non-editable
    registry[eid].textType = "mixed";
    return children;
  }

  const child = children[0];

  // CASE 1 — plain string literal → editable
  if (isStringLiteral(child) || isJSXText(child)) {
    registry[eid].textType = "static";
    registry[eid].staticText = child.value.trim();
    return [buildPatchTextCall(eid, child)];
    // → {__patchText("el-1", "Hello World")}
  }

  // CASE 2 — JSX expression container
  if (isJSXExpressionContainer(child)) {
    const expr = child.expression;

    // Simple string/number expression → editable
    if (isStringLiteral(expr) || isNumericLiteral(expr)) {
      registry[eid].textType = "static";
      registry[eid].staticText = String(expr.value);
      return [buildPatchTextCall(eid, child)];
    }

    // Identifier → look up in varMap
    if (isIdentifier(expr)) {
      const entry = varMap.get(expr.name);
      if (entry?.type === "static") {
        registry[eid].textType = "static";
        registry[eid].staticText = String(entry.value);
        return [buildPatchTextCall(eid, child)];
      }
    }

    // References frame / spring / interpolate → animated, do not touch
    if (referencesAnimationPrimitive(expr, varMap)) {
      registry[eid].textType = "animated";
      return children; // leave completely alone
    }

    // Loop variable or prop → dynamic, do not touch
    registry[eid].textType = "dynamic";
    return children;
  }

  // Template literal, ternary, or anything else → not editable
  registry[eid].textType = "dynamic";
  return children;
}
```

## 4.6 Element Type Routing

The top-level JSX visitor routes each node to the right handler:

```typescript
function visitJSXElement(path, varMap, counter) {
  const node = path.node;
  const elementName = getElementName(node); // "div", "AbsoluteFill", "SearchIcon", "img"

  // Skip non-visual Remotion primitives
  const SKIP = ["Sequence", "Series", "Loop", "Freeze", "OffthreadVideo"];
  if (SKIP.includes(elementName)) return;

  // Skip SVG children — only instrument the SVG wrapper
  if (hasSVGAncestor(path) && elementName !== "svg") return;

  const { inLoop, indexParam } = isInMapLoop(path);
  const eid = generateEid(node, counter.next(), inLoop, indexParam);

  // Inject data-eid always
  injectProp(node, "data-eid", inLoop ? templateLiteral(eid) : stringLiteral(eid));
  if (inLoop) injectProp(node, "data-eparent", stringLiteral(`el-${counter.current()}`));

  // Route to handler
  if (elementName === "img") {
    handleImg(node, eid, varMap);
  } else if (isIconComponent(elementName)) {
    handleIcon(node, eid, varMap);
  } else {
    handleGenericElement(node, eid, varMap);
  }

  // Build registry entry
  registry[eid] = buildRegistryEntry(eid, elementName, inLoop, ...);
}
```

## 4.7 Handling Multiple Return Statements

Even though the LLM is instructed to use one return, the transform handles multiple defensively:

```typescript
// Visit ALL return statements in the function body
path.traverse({
  ReturnStatement(returnPath) {
    if (isJSX(returnPath.node.argument)) {
      transformJSXTree(returnPath.node.argument, varMap, counter);
    }
  }
});
```

## 4.8 Handling Nested Function Components

```typescript
// If LLM defines inner components, instrument them too
path.traverse({
  FunctionDeclaration(fnPath) {
    if (isReactComponent(fnPath.node)) {
      const innerProps = extractPropNames(fnPath.node); // ["label", "color"]
      const innerVarMap = buildVariableMap(fnPath.node);
      transformJSXTree(fnPath.node.body, innerVarMap, counter, {
        dynamicIdentifiers: innerProps // treat prop references as dynamic
      });
    }
  }
});
```

## 4.9 Injected Preamble

Added to every compiled module:

```typescript
const __edits = window.__EDIT_STORE__ ?? {};

// Style override — merges on top of original style
function __patch(eid, style) {
  const edit = __edits[eid];
  if (!edit) return style;
  return { ...style, ...(edit.style ?? {}) };
}

// Static text replacement
function __patchText(eid, original) {
  return __edits[eid]?.text ?? original;
}

// Animation output range override
// Called in place of the outputRange argument to interpolate()
function __patchRange(eid, prop, defaultRange) {
  return __edits[eid]?.ranges?.[prop] ?? defaultRange;
}

// Spring config override
function __patchSpring(eid, prop, defaultConfig) {
  return { ...defaultConfig, ...(__edits[eid]?.springs?.[prop] ?? {}) };
}

// Image src replacement
function __patchAsset(eid, defaultSrc) {
  return __edits[eid]?.asset ?? defaultSrc;
}

// Icon component swap
function __patchIcon(eid, defaultEl) {
  const iconName = __edits[eid]?.icon;
  if (!iconName) return defaultEl;
  const Icon = window.__ICON_REGISTRY__?.[iconName];
  if (!Icon) return defaultEl;
  return React.createElement(Icon, defaultEl.props);
}
```

---

# 5. Registry Schema

```typescript
interface RegistryEntry {
  eid:           string;
  elementType:   string;              // "div", "img", "SearchIcon", etc.
  label:         string;              // human-readable for UI
  isLoopItem:    boolean;
  parentEid?:    string;              // set when isLoopItem = true

  // What can be shown in the property panel
  editableProps: {
    [propName: string]: {
      editable:    boolean;
      confidence:  "high" | "low";   // low = came from spread/ternary
      staticValue: any;              // original value from LLM code
    }
  };

  staticStyle:   Record<string, any>; // known inline static values
  animatedProps: Record<string, {     // props driven by animation
    type:        "interpolate" | "spring";
    outputRange?: any[];
    config?:     Record<string, any>;
  }>;
  nonEditable:   string[];            // props we cannot safely edit
  lowConfidence: string[];            // props editable but uncertain baseline

  // Text
  textType:   "static" | "dynamic" | "animated" | "mixed" | "none";
  staticText?: string;

  // Asset / icon
  assetType?: "image" | "icon" | "none";
  staticSrc?: string;
  iconName?:  string;
}
```

---

# 6. Edit Store

### Client-Side Shape

```typescript
interface ElementEdit {
  style?:   Record<string, string>;   // CSS property overrides
  text?:    string;                   // static text replacement
  asset?:   string;                   // image src replacement (CDN URL)
  icon?:    string;                   // icon component name
  ranges?:  Record<string, any[]>;    // interpolate output range overrides
  springs?: Record<string, Record<string, number>>; // spring config overrides
  transform?: {                       // position/size from drag handles
    translateX?: number;
    translateY?: number;
    scaleX?:     number;
    scaleY?:     number;
  };
}

// window.__EDIT_STORE__
type EditStore = Record<string, ElementEdit>;

// Example
{
  "el-1":   { style: { color: "red" }, text: "New Headline" },
  "el-2-0": { style: { background: "#4f46e5" } },
  "el-4":   { asset: "https://cdn.example.com/new-hero.png" },
  "el-5":   { icon: "StarIcon" },
  "el-3":   { transform: { translateX: 40, translateY: -20 } }
}
```

### Persistence

```typescript
// React state — single source of truth
const [editStore, setEditStore] = useState<EditStore>({});

function applyEdit(eid: string, patch: Partial<ElementEdit>) {
  setEditStore(prev => {
    const next = deepMerge(prev, { [eid]: patch });
    window.__EDIT_STORE__ = next;    // patch engine reads this synchronously
    debouncedSave(next);             // persist to backend (500ms debounce)
    return next;
  });
}

// POST /api/projects/:id/edits
{
  projectId: "proj_123",
  codeHash:  "a3f9bc...",   // hash of generated code — invalidate on regen
  edits:     { ...editStore }
}

// On load — rehydrate
useEffect(() => {
  const saved = await fetchEdits(projectId);
  if (saved.codeHash === currentCodeHash) {
    setEditStore(saved.edits);
    window.__EDIT_STORE__ = saved.edits;
  }
  // If codeHash mismatch: edits are stale — discard or prompt user
}, []);
```

# 12. Future Expansion

The architecture is a plugin system. Adding new edit types is purely additive.

### Adding Opacity / Animation Range Editing
- `__patchRange()` is already specified — activate when needed
- AST transform already detects `interpolate()` and tags it in `registry.animatedProps`
- Property panel reads `animatedProps` and shows From/To sliders

### Adding Spring Config Editing
- `__patchSpring()` is already specified
- AST transform already detects `spring()` and tags in `registry.animatedProps`

### Adding Video / Audio Asset Swapping
- Extend `assetType` to include `"video" | "audio"`
- AST: detect `<OffthreadVideo src=...>` and `<Audio src=...>`
- `__patchAsset()` already handles `src` replacement for any element type

### Known Limitations

| Case | Why It Fails | Behaviour |
|---|---|---|
| Styles in external functions | `getStyle()` returns unknown shape | Blind `__patch` — no panel values |
| Fully dynamic text | Ternary, template literal children | Prompt-only editing |
| Dynamic component types | `const Tag = cond ? "h1" : "div"` | `data-eid` injected, type unknown |
| SVG internals | Complex SVG child elements | SVG wrapper only, not children |
| Stale edits after regen | `codeHash` mismatch on regen | Prompt user to discard or keep |
| Spring output in expression | `height * item.value` | Prompt-only, panel shows nothing |

---

# 13. Implementation Order

1. **Transform service skeleton** — Babel parse + generate roundtrip, HTTP endpoint
2. **Variable map pre-pass** — static, interpolate, spring detection
3. **EID injection** — plain elements + loop items with index
4. **`__patch` injection** — inline static styles only first
5. **Preamble injection** — `__patch` / `__patchText` at module top
6. **Registry extraction** — `staticStyle`, `textType`, `editableProps`
7. **Frontend overlay** — DOM scan, rects, dotted borders, hover
8. **Click detection** — pointer-events trick, walk-up to `data-eid`
9. **Property panel** — colour picker, text input, driven by registry
10. **Edit store + persistence** — React state, `window.__EDIT_STORE__`, debounced save
11. **Drag handles** — move + corner resize, transform edits
12. **Fallback cases** — spread, ternary, inline animation, nested components
13. **Asset / icon editing** — `__patchAsset`, `__patchIcon`, icon registry

---

*Remotion Visual Editor — Implementation Specification*