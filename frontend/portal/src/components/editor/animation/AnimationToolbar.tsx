/**
 * AnimationToolbar
 *
 * Router component: reads the selected element's registry entry and renders
 * the appropriate sub-toolbar based on the primitive's component type.
 *
 * Routing:
 *   - Text          → TextToolbar (text content, variant, styling)
 *   - Counter       → CounterToolbar (from, to, format, prefix, suffix)
 *   - WordCycle     → WordCycleToolbar (words, transition)
 *   - Typewriter    → TypewriterToolbar (text, mode)
 *   - TitleCard     → TitleCardToolbar (heading, subheading, eyebrow)
 *   - FadeIn/SlideIn/ScaleIn/FadeOut/SlideOut/ScaleOut → AnimationPropToolbar (timing + direction)
 *   - Stagger/TimelineGate → TimingToolbar (startAt, delayBetween, etc.)
 *   - Layout types  → no toolbar (not selectable per spec)
 */

import React from 'react'
import type { PrimitiveElement, PatchOverlay } from '@coasterai/renderer'
import { TextToolbar } from './toolbars/TextToolbar'
import { CounterToolbar } from './toolbars/CounterToolbar'
import { WordCycleToolbar } from './toolbars/WordCycleToolbar'
import { TimingToolbar } from './toolbars/TimingToolbar'
import { StyleOverrideSection } from './toolbars/shared'

interface AnimationToolbarProps {
  selectedId: string
  registry: Record<string, PrimitiveElement>
  editOverlay: PatchOverlay
  onValuePatch: (id: string, prop: string, value: unknown) => void
  onValuePatches: (id: string, values: Record<string, unknown>) => void
  onStyleOverride: (id: string, style: Record<string, string | number>) => void
  onDeselect: () => void
}

export function AnimationToolbar({
  selectedId,
  registry,
  editOverlay,
  onValuePatch,
  onValuePatches,
  onStyleOverride,
  onDeselect: _onDeselect,
}: AnimationToolbarProps) {
  const entry = registry[selectedId]
  if (!entry) return null

  const { componentName } = entry

  // Merge original props with value patches for current values
  const patches = editOverlay[selectedId]?.value ?? {}
  const currentProps = { ...entry.props, ...patches }
  const styleOverride = editOverlay[selectedId]?.styleOverride ?? {}

  const onStyleOverrideFn = (style: Record<string, string | number>) => onStyleOverride(selectedId, style)

  const commonProps = {
    id: selectedId,
    componentName,
    currentProps,
    styleOverride,
    onValuePatch: (prop: string, value: unknown) => onValuePatch(selectedId, prop, value),
    onValuePatches: (values: Record<string, unknown>) => onValuePatches(selectedId, values),
    onStyleOverride: onStyleOverrideFn,
  }

  // Content components that render text — show style override section
  const isTextContent = componentName === 'Text' || componentName === 'Typewriter' ||
    componentName === 'Counter' || componentName === 'WordCycle' || componentName === 'TitleCard'

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/95 backdrop-blur-lg border border-border shadow-xl text-sm select-none">
      {/* Content primitives — component-specific controls */}
      {componentName === 'Text' && <TextToolbar {...commonProps} />}
      {componentName === 'Counter' && <CounterToolbar {...commonProps} />}
      {componentName === 'WordCycle' && <WordCycleToolbar {...commonProps} />}
      {componentName === 'Typewriter' && <TextToolbar {...commonProps} />}
      {componentName === 'TitleCard' && <TextToolbar {...commonProps} />}

      {/* Animation primitives — timing + direction controls */}
      {(componentName === 'FadeIn' || componentName === 'FadeOut' ||
        componentName === 'SlideIn' || componentName === 'SlideOut' ||
        componentName === 'ScaleIn' || componentName === 'ScaleOut' ||
        componentName === 'Stagger' || componentName === 'TimelineGate') && (
        <TimingToolbar {...commonProps} />
      )}

      {/* Style override section — always shown for text content, collapsed by default */}
      {isTextContent && (
        <StyleOverrideSection
          styleOverride={styleOverride}
          onStyleOverride={onStyleOverrideFn}
        />
      )}
    </div>
  )
}
