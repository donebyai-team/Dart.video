import * as Babel from "@babel/standalone";
import * as LucideReact from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as AnimationPrimitives from "@coasterai/animation";
import { REGISTERED_COMPONENT_NAMES, useTheme, parseText } from "@coasterai/animation";

import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
  random,
} from "remotion";


export interface CompilationResult {
  Component: React.ComponentType<any> | null;
  error: string | null;
}

export interface CompileRemoteComponentOptions {
  validateShapeProps?: boolean;
}

interface GuardedRemoteComponentProps {
  __onTemplateRuntimeError?: (error: Error) => void;
  [key: string]: unknown;
}



// Parameter names injected into every compiled component's scope.
// Order must exactly match SHARED_PARAM_VALUES below.
const SHARED_PARAM_NAMES: string[] = [
  "React",
  "useState",
  "useEffect",
  "useMemo",
  "useRef",
  "AbsoluteFill",
  "interpolate",
  "useCurrentFrame",
  "useVideoConfig",
  "spring",
  "Sequence",
  "Easing",
  "random",
  "parseText",
  // Lucide icons — injected as the full module; individual icons are
  // destructured from this via buildLucideDestructure()
  "__LucideReact__",
  // Animation primitives — all registered components injected as named bindings.
  // Derived from @coasterai/animation registry; adding a component there makes it
  // automatically available here. LLM writes <FadeIn> and this scope has FadeIn.
  ...Array.from(REGISTERED_COMPONENT_NAMES),
  "useTheme"
];
function getSharedParamValues(validateShapePropsOption: boolean): unknown[] {
  return [
    React,
    useState,
    useEffect,
    useMemo,
    useRef,
    AbsoluteFill,
    interpolate,
    useCurrentFrame,
    useVideoConfig,
    spring,
    Sequence,
    Easing,
    random,
    parseText,
    LucideReact,
    // Animation primitive values — each registered component name maps to its implementation.
    // Order must match the names appended to SHARED_PARAM_NAMES above.
    ...Array.from(REGISTERED_COMPONENT_NAMES).map((name) => {
      const val = (AnimationPrimitives as Record<string, unknown>)[name];
      return val;
    }),
    useTheme,
  ];
}

// ─── Reserved name conflict detection ────────────────────────────────────────

// Detect local variable or function declarations that shadow a registered
// animation primitive name. Throws a descriptive error — never silently renames.
function checkReservedNameConflicts(code: string): void {
  // Match: const FadeIn = ..., function SlideIn(...), let Counter = ..., var Text = ...
  const declPattern = /(?:const|let|var|function)\s+([A-Z][a-zA-Z0-9]*)/g;
  let match: RegExpExecArray | null;
  while ((match = declPattern.exec(code)) !== null) {
    const name = match[1];
    if (name && REGISTERED_COMPONENT_NAMES.has(name)) {
      throw new Error(
        `Reserved component name conflict: "${name}" is a registered animation primitive and cannot be redeclared as a local variable or function. ` +
        `Rename your local declaration to avoid shadowing the primitive.`
      );
    }
  }
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
    // Check for reserved component name shadowing before any transformation.
    checkReservedNameConflicts(code);

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

    const GuardedComponent: React.FC<GuardedRemoteComponentProps> = (props) => {
      const { __onTemplateRuntimeError, ...componentProps } = props;

      try {
        return (Component as (props: Record<string, unknown>) => React.ReactNode)(componentProps);
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        __onTemplateRuntimeError?.(normalizedError);
        return null;
      }
    };

    GuardedComponent.displayName =
      (Component as { displayName?: string; name?: string }).displayName ??
      (Component as { name?: string }).name ??
      "GuardedRemoteComponent";

    return { Component: GuardedComponent, error: null };
  } catch (error) {
    return {
      Component: null,
      error: error instanceof Error ? error.message : "Unknown compilation error",
    };
  }
}
