# Implementation Clarifications

Answers to key decisions raised during Phase 1 implementation.

---

## Easing

Primitives read from `StyleContext.motion` only. LLM has zero easing control.

The easing resolver accepts `(character, primitiveType)` — not just `(character)`. A style can define different motion characters per primitive type. Example: `playful` style uses bouncy entrances but snappy counters. Define this in the style preset and resolver in `src/styles/`.

Sure.

Right now the spec says each style has a single `motion.character` — something like `playful`. And the easing resolver takes that character and returns a spring config. Every primitive in that style gets the same spring config.

The problem is that `playful` might make sense for a FadeIn or SlideIn — you want that bouncy overshoot when a card enters. But for a Counter that's counting from 0 to 9800, a bouncy overshoot means the number briefly goes past 9800 then comes back down. That looks wrong. A counter should ease out cleanly and land exactly on the target value.

Same style, same character, but two primitives where the character means something completely different visually.

So instead of the resolver being called like `getSpringConfig("playful")` and returning one config, it should be called like `getSpringConfig("playful", "counter")` and the resolver has a lookup table that says — for the playful character, counters get damping 20 stiffness 200 (clean landing), but entrances get damping 8 stiffness 150 (bouncy overshoot).

The style preset would define something like:

```
playful: {
  motion: {
    entrance:  { damping: 8,   stiffness: 150 }  ← bouncy
    counter:   { damping: 20,  stiffness: 200 }  ← clean landing
    typewriter:{ damping: 100, stiffness: 200 }  ← no spring, mechanical
    exit:      { damping: 15,  stiffness: 120 }  ← moderate
  }
}
```

Each primitive type knows its own category and passes it to the resolver. FadeIn passes "entrance", Counter passes "counter", Typewriter passes "typewriter". The style controls all of them independently without the LLM being involved at all.

The alternative — one global spring config per style — is simpler to implement but produces weird results the moment a style with strong personality (playful, elastic) is applied to data-heavy animations where bouncing numbers look like bugs.

---

## Duration

Probe render runs at `frame=0`. Every primitive registers its end frame unconditionally — never inside an if-statement or useEffect.

JSX conditionals on animated elements are forbidden. Add to prompt rules:

> Never use JSX conditionals for animated elements. Use `<TimelineGate showAfter={n}>` instead of `{frame > n && <FadeIn>}`.

---

## Patch System

Two coexisting code paths. Mutually exclusive per element — never mixed:

- **Primitive-backed elements** — JSX tag matches a registered component name → new typed patch system (value / swap / position / size / speed patches)
- **Legacy raw Remotion elements** — unrecognized tags → existing `__patch` helpers unchanged

The compiler detects which path applies per element at the AST pass stage. The registry is the source of truth for what counts as a primitive-backed element.

---

## Scope Injection

Injected scope list is derived from the registry at compile time — not hardcoded in the compiler. Adding a component to the registry automatically makes it available in scope. No compiler changes required when adding new primitives.

---

## Zod Schemas

Every component has two schema layers:

- **Full schema** — all props including internal fields. Used for type safety and patch validation.
- **Editor schema** — subset of props exposed in the editor toolbar. Defined explicitly per component.

These are separate. Internal fields (e.g. `_endFrame`) appear in the full schema but never in the editor schema. Define both when registering a component in `src/registry/`.

---

## Frame Prop

`frame` is injected by the compiler into the generated component's top-level props. The LLM receives it and passes it only to primitives that need it.

Add to prompt rules:

> Pass `frame` only to animation primitives (FadeIn, SlideIn, etc.) and content primitives (Counter, Typewriter, WordCycle). Never pass `frame` to layout primitives (Stack, Row, SafeArea) or plain HTML elements.

---

## Reserved Component Names

Registry component names are reserved words in generated code. The compiler detects local variable or function declarations that shadow a registered component name and throws a descriptive error before execution. Do not silently rename — surface the conflict clearly.