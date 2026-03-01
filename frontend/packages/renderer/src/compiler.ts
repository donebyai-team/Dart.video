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
// import * as THREE from "three";

export interface CompilationResult {
  Component: React.ComponentType<any> | null;
  error: string | null;
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

// Parameter names injected into every compiled component's scope.
// Order must exactly match SHARED_PARAM_VALUES below.
const SHARED_PARAM_NAMES: string[] = [
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

// Values corresponding to SHARED_PARAM_NAMES, in the same order.
const SHARED_PARAM_VALUES: unknown[] = [
  React,
  RemotionBundle,
  RemotionShapes,
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
  RemotionShapes.Rect,
  RemotionShapes.Circle,
  RemotionShapes.Triangle,
  RemotionShapes.Star,
  RemotionShapes.Polygon,
  RemotionShapes.Ellipse,
  RemotionShapes.Heart,
  RemotionShapes.Pie,
  RemotionShapes.makeRect,
  RemotionShapes.makeCircle,
  RemotionShapes.makeTriangle,
  RemotionShapes.makeStar,
  RemotionShapes.makePolygon,
  RemotionShapes.makeEllipse,
  RemotionShapes.makeHeart,
  RemotionShapes.makePie,
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
function evalWithScope(body: string): unknown {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function(...SHARED_PARAM_NAMES, body) as (
    ...args: unknown[]
  ) => unknown;
  return fn(...SHARED_PARAM_VALUES);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compile LLM-generated code that exports `RemoteComponent({ props, onChange })`.
 * Strips all imports (injecting lucide icon bindings back in scope), removes
 * export keywords so the code can run inside a new Function, transpiles with
 * Babel, and returns the RemoteComponent function.
 */
export function compileRemoteComponent(code: string): CompilationResult {
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
    const Component = evalWithScope(`${transpiled}\nreturn RemoteComponent;`);

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
