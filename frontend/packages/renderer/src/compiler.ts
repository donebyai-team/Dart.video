import * as Babel from "@babel/standalone";
import * as LucideReact from "lucide-react";
// import { Lottie } from "@remotion/lottie";
import * as RemotionShapes from "@remotion/shapes";
// import { ThreeCanvas } from "@remotion/three";
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from "@remotion/transitions";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { fade } from "@remotion/transitions/fade";
import { flip } from "@remotion/transitions/flip";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { EditableText } from './lib/EditableText'

import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  REMOTION_SHAPES_PROP_MAP,
  REMOTION_SHAPES_SPECIFIC_PROP_MAP,
} from "./generated/remotion-shapes-props";
// import * as THREE from "three";

export interface CompilationResult {
  Component: React.ComponentType<any> | null;
  error: string | null;
}

export interface CompileRemoteComponentOptions {
  validateShapeProps?: boolean;
}

// Shared Remotion object available as `Remotion.X` inside compiled components
const RemotionBundle = {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  Sequence,
  Img,
};

const SHAPE_PROPS_ALLOWLIST = Object.fromEntries(
  Object.entries(REMOTION_SHAPES_PROP_MAP).map(([shapeName, propNames]) => [
    shapeName,
    new Set(propNames),
  ]),
) as Record<string, Set<string>>;

const SHAPE_SPECIFIC_PROPS = Object.fromEntries(
  Object.entries(REMOTION_SHAPES_SPECIFIC_PROP_MAP).map(([shapeName, propNames]) => [
    shapeName,
    new Set(propNames),
  ]),
) as Record<string, Set<string>>;

const SHAPE_NAMES = new Set(Object.keys(REMOTION_SHAPES_PROP_MAP));

const SHAPE_SINGLE_LETTER_ALIASES = Object.fromEntries(
  Object.entries(REMOTION_SHAPES_SPECIFIC_PROP_MAP).map(([shapeName, propNames]) => {
    const aliasToProp = new Map<string, string>();
    const duplicateAliases = new Set<string>();
    const specificSet = new Set(propNames);

    for (const propName of propNames) {
      if (propName.length <= 1) continue;
      const alias = propName[0].toLowerCase();
      if (specificSet.has(alias)) continue;
      if (aliasToProp.has(alias) && aliasToProp.get(alias) !== propName) {
        duplicateAliases.add(alias);
      } else {
        aliasToProp.set(alias, propName);
      }
    }

    duplicateAliases.forEach((alias) => {
      aliasToProp.delete(alias);
    });

    return [shapeName, aliasToProp];
  }),
) as Record<string, Map<string, string>>;

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function suggestClosestProp(invalidProp: string, allowedProps: Set<string>): string | null {
  let bestMatch: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  allowedProps.forEach((propName) => {
    const distance = levenshteinDistance(invalidProp, propName);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = propName;
    }
  });

  return bestDistance <= 3 ? bestMatch : null;
}

function validateShapeProps(shapeName: string, props: Record<string, unknown> | null | undefined): void {
  if (!props || typeof props !== "object") return;

  const allowedProps = SHAPE_PROPS_ALLOWLIST[shapeName];
  if (!allowedProps) return;
  const specificProps = SHAPE_SPECIFIC_PROPS[shapeName];
  const singleLetterAliases = SHAPE_SINGLE_LETTER_ALIASES[shapeName];

  for (const propName of Object.keys(props)) {
    if (propName === "children") continue;
    if (propName.startsWith("aria-")) continue;
    if (propName.startsWith("data-")) continue;

    if (specificProps && !specificProps.has(propName) && singleLetterAliases?.has(propName)) {
      const expectedProp = singleLetterAliases.get(propName);
      throw new Error(
        `Invalid prop "${propName}" on <${shapeName}>. Did you mean "${expectedProp}"?`,
      );
    }

    if (allowedProps.has(propName)) continue;

    const suggestion = suggestClosestProp(propName, allowedProps);
    const suggestionText = suggestion ? ` Did you mean "${suggestion}"?` : "";
    throw new Error(`Invalid prop "${propName}" on <${shapeName}>.${suggestionText}`);
  }
}

function validateMakeShapeArgs(
  shapeName: string,
  args: Record<string, unknown> | null | undefined,
): void {
  if (!args || typeof args !== "object") return;
  const allowedProps = SHAPE_SPECIFIC_PROPS[shapeName];
  if (!allowedProps) return;

  for (const argName of Object.keys(args)) {
    if (allowedProps.has(argName)) continue;
    const suggestion = suggestClosestProp(argName, allowedProps);
    const suggestionText = suggestion ? ` Did you mean "${suggestion}"?` : "";
    throw new Error(`Invalid option "${argName}" passed to make${shapeName}().${suggestionText}`);
  }
}

function wrapShapeComponent(shapeName: string, Component: unknown): unknown {
  if (typeof Component !== "function") return Component;
  if (!SHAPE_NAMES.has(shapeName)) return Component;

  const WrappedComponent = (props: Record<string, unknown>) => {
    validateShapeProps(shapeName, props);
    return React.createElement(Component as React.ComponentType<any>, props);
  };

  WrappedComponent.displayName = `Validated${shapeName}`;
  return WrappedComponent;
}

function getShapeNameFromMakeFunction(exportName: string): string | null {
  if (!exportName.startsWith("make")) return null;
  const shapeName = exportName.slice(4);
  return SHAPE_NAMES.has(shapeName) ? shapeName : null;
}

function wrapMakeShapeFunction(shapeName: string, makeFunction: unknown): unknown {
  if (typeof makeFunction !== "function") return makeFunction;

  const WrappedMakeShape = (
    options: Record<string, unknown>,
    ...rest: unknown[]
  ) => {
    validateMakeShapeArgs(shapeName, options);
    return (makeFunction as (...args: unknown[]) => unknown)(options, ...rest);
  };

  return WrappedMakeShape;
}

const SafeRemotionShapes = Object.fromEntries(
  Object.entries(RemotionShapes).map(([name, value]) => {
    const makeShapeName = getShapeNameFromMakeFunction(name);
    if (makeShapeName) {
      return [name, wrapMakeShapeFunction(makeShapeName, value)];
    }

    return [name, wrapShapeComponent(name, value)];
  }),
) as typeof RemotionShapes;

// Parameter names injected into every compiled component's scope.
// Order must exactly match SHARED_PARAM_VALUES below.
const SHARED_PARAM_NAMES: string[] = [
  "EditableText",
  "React",
  "Remotion",
  "RemotionShapes",
  "Lottie",        // reserved / null — not yet enabled
  "ThreeCanvas",   // reserved / null — not yet enabled
  "THREE",         // reserved / null — not yet enabled
  "AbsoluteFill",
  "interpolate",
  "useCurrentFrame",
  "useVideoConfig",
  "Easing",
  "spring",
  "Sequence",
  "Img",
  "useState",
  "useEffect",
  "useMemo",
  "useRef",
  // RemotionShapes destructured for convenience
  "Rect",
  "Circle",
  "Triangle",
  "Star",
  "Polygon",
  "Ellipse",
  "Heart",
  "Pie",
  "makeRect",
  "makeCircle",
  "makeTriangle",
  "makeStar",
  "makePolygon",
  "makeEllipse",
  "makeHeart",
  "makePie",
  // Transitions
  "TransitionSeries",
  "linearTiming",
  "springTiming",
  "fade",
  "slide",
  "wipe",
  "flip",
  "clockWipe",
  // Lucide icons — injected as the full module; individual icons are
  // destructured from this via buildLucideDestructure()
  "__LucideReact__",
];

function getSharedParamValues(validateShapePropsOption: boolean): unknown[] {
  const injectedShapes = validateShapePropsOption ? SafeRemotionShapes : RemotionShapes;

  return [
    EditableText,
    React,
    RemotionBundle,
    injectedShapes,
    null, // Lottie
    null, // ThreeCanvas
    null, // THREE
    AbsoluteFill,
    interpolate,
    useCurrentFrame,
    useVideoConfig,
    Easing,
    spring,
    Sequence,
    Img,
    useState,
    useEffect,
    useMemo,
    useRef,
    injectedShapes.Rect,
    injectedShapes.Circle,
    injectedShapes.Triangle,
    injectedShapes.Star,
    injectedShapes.Polygon,
    injectedShapes.Ellipse,
    injectedShapes.Heart,
    injectedShapes.Pie,
    injectedShapes.makeRect,
    injectedShapes.makeCircle,
    injectedShapes.makeTriangle,
    injectedShapes.makeStar,
    injectedShapes.makePolygon,
    injectedShapes.makeEllipse,
    injectedShapes.makeHeart,
    injectedShapes.makePie,
    TransitionSeries,
    linearTiming,
    springTiming,
    fade,
    slide,
    wipe,
    flip,
    clockWipe,
    LucideReact,
  ];
}

// ─── Import stripping ────────────────────────────────────────────────────────

// Strip all ES module import statements from code. We must do this before
// passing to new Function because dynamic functions cannot have import declarations.
export function stripImports(code: string): string {
  let cleaned = code;
  // import type { ... } from "...";
  cleaned = cleaned.replace(
    /import\s+type\s*\{[\s\S]*?\}\s*from\s*["'][^"']+["'];?/g,
    "",
  );
  // import X, { ... } from "...";
  cleaned = cleaned.replace(
    /import\s+\w+\s*,\s*\{[\s\S]*?\}\s*from\s*["'][^"']+["'];?/g,
    "",
  );
  // import { ... } from "...";  (handles multi-line)
  cleaned = cleaned.replace(
    /import\s*\{[\s\S]*?\}\s*from\s*["'][^"']+["'];?/g,
    "",
  );
  // import * as X from "...";
  cleaned = cleaned.replace(
    /import\s+\*\s+as\s+\w+\s+from\s*["'][^"']+["'];?/g,
    "",
  );
  // import X from "...";
  cleaned = cleaned.replace(/import\s+\w+\s+from\s*["'][^"']+["'];?/g, "");
  // import "...";
  cleaned = cleaned.replace(/import\s*["'][^"']+["'];?/g, "");
  return cleaned.trim();
}

// ─── Lucide-react handling ────────────────────────────────────────────────────

// Scan the original code (before import stripping) for any named lucide-react
// imports so we can re-inject them as a destructuring from __LucideReact__.
// Handles aliased imports: `import { ArrowRight as Arrow } from 'lucide-react'`
function extractLucideImports(
  code: string,
): Array<{ name: string; alias: string }> {
  const result: Array<{ name: string; alias: string }> = [];

  const regex = /import\s*\{([^}]+)\}\s*from\s*["']lucide-react["'];?/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    const items = match[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const item of items) {
      const parts = item.split(/\s+as\s+/);

      result.push({
        name: parts[0].trim(),
        alias: (parts[1] || parts[0]).trim(),
      });
    }
  }

  return result;
}

// Build `const { ArrowRight, Star: StarIcon } = __LucideReact__;` so that
// icons referenced in the LLM code resolve after imports are stripped.
function buildLucideDestructure(
  imports: Array<{ name: string; alias: string }>,
): string {
  if (imports.length === 0) return "";
  const entries = imports
    .map(({ name, alias }) => (name === alias ? name : `${name}: ${alias}`))
    .join(", ");
  return `const { ${entries} } = __LucideReact__;`;
}

// ─── Babel transform ──────────────────────────────────────────────────────────

// Common Babel transform options. sourceType "script" avoids Babel injecting
// `"use strict"` and treats the code as a plain script (not an ES module),
// which is correct since we've already stripped all import/export statements.
function babelTransform(source: string, filename: string): string {
  const result = Babel.transform(source, {
    presets: ["react", "typescript"],
    filename,
    sourceType: "script",
  });
  if (!result?.code) throw new Error("Babel produced no output");
  return result.code;
}

// ─── Compile helpers ──────────────────────────────────────────────────────────

// Create a Function from param names + body string and immediately call it
// with the shared values, returning whatever the body returns.
function evalWithScope(body: string, validateShapePropsOption: boolean): unknown {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function(...SHARED_PARAM_NAMES, body) as (
    ...args: unknown[]
  ) => unknown;
  return fn(...getSharedParamValues(validateShapePropsOption));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compile LLM-generated code that exports `RemoteComponent({ props, onChange })`.
 * Strips all imports (injecting lucide icon bindings back in scope), removes
 * export keywords so the code can run inside a new Function, transpiles with
 * Babel, and returns the RemoteComponent function.
 */
export function compileRemoteComponent(
  code: string,
  options: CompileRemoteComponentOptions = {},
): CompilationResult {
  if (!code?.trim()) {
    return { Component: null, error: "No code provided" };
  }

  try {
    const lucideImports = extractLucideImports(code);
    const lucideDestructure = buildLucideDestructure(lucideImports);

    // Strip all import statements then strip export keywords so the code can
    // be evaluated inside a new Function (which has no module scope).
    let cleaned = stripImports(code);
    cleaned = cleaned.replace(/^export\s+default\s+/gm, "");
    cleaned = cleaned.replace(/^export\s+/gm, "");
    cleaned = cleaned.trim();

    const source = lucideDestructure ? `${lucideDestructure}\n${cleaned}` : cleaned;
    const transpiled = babelTransform(source, "remote-component.tsx");
    const Component = evalWithScope(
      `${transpiled}\nreturn RemoteComponent;`,
      Boolean(options.validateShapeProps),
    );

    if (typeof Component !== "function") {
      return {
        Component: null,
        error: "Code must export a RemoteComponent function",
      };
    }

    return { Component: Component as React.ComponentType<any>, error: null };
  } catch (error) {
    return {        
      Component: null,
      error: error instanceof Error ? error.message : "Unknown compilation error",
    };
  }
}
