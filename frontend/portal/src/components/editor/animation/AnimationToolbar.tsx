/**
 * AnimationToolbar
 *
 * Routes to the correct sub-toolbar based on the selected element's ID.
 * Component metadata comes from COMPONENT_REGISTRY (via resolveComponentFromId).
 * Current prop values come from the PatchOverlay.
 *
 * Routing:
 *   Primitive ID (e.g. "fadein-0")  → full toolbar from registry editorProps
 *   Raw HTML ID ("el-0")            → style-only toolbar
 *   Custom component ("custom-0")   → style-only toolbar
 */

import React from 'react'
import {
  resolveComponentFromId,
  getElementTypeFromId,
  type PatchOverlay,
} from '@coasterai/renderer'
import { TextToolbar } from './toolbars/TextToolbar'
import { CounterToolbar } from './toolbars/CounterToolbar'
import { WordCycleToolbar } from './toolbars/WordCycleToolbar'
import { TimingToolbar } from './toolbars/TimingToolbar'
import { StyleOverrideSection } from './toolbars/shared'

interface AnimationToolbarProps {
  selectedId: string
  overlay: PatchOverlay
  onValuePatch: (id: string, prop: string, value: unknown) => void
  onStyleOverride: (id: string, style: Record<string, string | number>) => void
  onDeselect: () => void
}

export function AnimationToolbar({
  selectedId,
  overlay,
  onValuePatch,
  onStyleOverride,
  onDeselect: _onDeselect,
}: AnimationToolbarProps) {
  const elType = getElementTypeFromId(selectedId)
  const registration = elType === 'primitive' ? resolveComponentFromId(selectedId) : null
  const componentName = registration?.name ?? null

  // Current prop values = initial LLM values + user overrides (both in overlay)
  const currentProps = overlay[selectedId]?.value ?? {}
  const styleOverride = overlay[selectedId]?.styleOverride ?? {}

  const onValuePatchFn = (prop: string, value: unknown) => onValuePatch(selectedId, prop, value)
  const onStyleOverrideFn = (style: Record<string, string | number>) => onStyleOverride(selectedId, style)

  const commonProps = {
    id: selectedId,
    componentName: componentName ?? '',
    currentProps,
    onValuePatch: onValuePatchFn,
  }

  // Content primitives that render text
  const isTextContent = componentName === 'Text' || componentName === 'Typewriter' ||
    componentName === 'Counter' || componentName === 'WordCycle' || componentName === 'TitleCard'

  // Animation primitives (timing controls)
  const isAnimation = componentName === 'FadeIn' || componentName === 'FadeOut' ||
    componentName === 'SlideIn' || componentName === 'SlideOut' ||
    componentName === 'ScaleIn' || componentName === 'ScaleOut' ||
    componentName === 'Stagger' || componentName === 'TimelineGate'

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/95 backdrop-blur-lg border border-border shadow-xl text-sm select-none">

      {/* ── Primitive: content-specific controls ──────────────────────── */}
      {componentName === 'Text' && <TextToolbar {...commonProps} />}
      {componentName === 'Typewriter' && <TextToolbar {...commonProps} />}
      {componentName === 'TitleCard' && <TextToolbar {...commonProps} />}
      {componentName === 'Counter' && <CounterToolbar {...commonProps} />}
      {componentName === 'WordCycle' && <WordCycleToolbar {...commonProps} />}

      {/* ── Primitive: animation timing controls ─────────────────────── */}
      {isAnimation && <TimingToolbar {...commonProps} />}

      {/* ── Style override section ───────────────────────────────────── */}
      {/* Always shown for text content + raw HTML + custom components.
          For animation primitives, only shown if user has existing overrides. */}
      {(isTextContent || elType === 'html' || elType === 'custom' ||
        (isAnimation && Object.keys(styleOverride).length > 0)) && (
        <StyleOverrideSection
          styleOverride={styleOverride}
          onStyleOverride={onStyleOverrideFn}
        />
      )}
    </div>
  )
}
