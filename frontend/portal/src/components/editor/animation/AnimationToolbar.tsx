/**
 * AnimationToolbar
 *
 * Flat, wrapping toolbar that shows all editable controls for the selected element.
 * No collapsed sections — everything visible. Wraps to a second line if too wide.
 *
 * Controls with non-obvious purpose get an icon + hover tooltip.
 * Color/font controls are self-explanatory and don't need icons.
 */

import React, { useState } from 'react'
import {
  Timer, Clock, ArrowUpDown, Ruler, Hash,
  Type, Heading1, Heading2, Tag, ALargeSmall,
  Eye, EyeOff, Layers, GalleryHorizontalEnd,
  Shuffle, X, Plus,
} from 'lucide-react'
import {
  resolveComponentFromId,
  getElementTypeFromId,
  type PatchOverlay,
} from '@coasterai/renderer'
import {
  NumberStepper,
  SelectInput,
  SliderInput,
  ColorSwatch,
} from './toolbars/shared'

// ─── Options ────────────────────────────────────────────────────────────────

const VARIANT_OPTIONS = [
  { label: 'Caption', value: 'caption' },
  { label: 'Label', value: 'label' },
  { label: 'Body', value: 'body' },
  { label: 'Subheading', value: 'subheading' },
  { label: 'Heading', value: 'heading' },
  { label: 'Display', value: 'display' },
]

const DIRECTION_OPTIONS = [
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
  { label: 'Top', value: 'top' },
  { label: 'Bottom', value: 'bottom' },
]

const TYPEWRITER_MODE_OPTIONS = [
  { label: 'Char', value: 'char' },
  { label: 'Word', value: 'word' },
  { label: 'Line', value: 'line' },
]

const WORDCYCLE_TRANSITION_OPTIONS = [
  { label: 'Fade Swap', value: 'fadeSwap' },
  { label: 'Slide Up', value: 'slideUp' },
  { label: 'Flip Y', value: 'flipY' },
]

const FONT_WEIGHT_OPTIONS = [
  { label: 'Thin', value: '100' },
  { label: 'Light', value: '300' },
  { label: 'Normal', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'Semibold', value: '600' },
  { label: 'Bold', value: '700' },
  { label: 'Extrabold', value: '800' },
]

const LETTER_SPACING_OPTIONS = [
  { label: 'Tight', value: '-0.025em' },
  { label: 'Normal', value: '0em' },
  { label: 'Wide', value: '0.025em' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Icon + tooltip wrapper for a control group */
function CtrlGroup({ icon, tooltip, children }: {
  icon: React.ReactNode
  tooltip: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-1.5 shrink-0" title={tooltip}>
      <span className="text-muted-foreground shrink-0">{icon}</span>
      {children}
    </div>
  )
}

/** Thin vertical divider */
function Div() {
  return <div className="w-px h-5 bg-border/60 mx-0.5 shrink-0" />
}

// ─── Main component ─────────────────────────────────────────────────────────

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

  const currentProps = overlay[selectedId]?.value ?? {}
  const styleOverride = overlay[selectedId]?.styleOverride ?? {}

  const vp = (prop: string, value: unknown) => onValuePatch(selectedId, prop, value)
  const so = (style: Record<string, string | number>) => onStyleOverride(selectedId, style)

  // WordCycle draft state
  const [wcDraft, setWcDraft] = useState('')

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background/95 backdrop-blur-lg border border-border shadow-xl text-sm select-none max-w-[700px]">

      {/* ═══ TEXT ═══ */}
      {componentName === 'Text' && (
        <>
          <CtrlGroup icon={<Type size={13} />} tooltip="Text content">
            <input
              type="text"
              value={String(currentProps.children ?? '')}
              onChange={e => vp('children', e.target.value)}
              placeholder="Text"
              className="h-7 w-32 px-2 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
            />
          </CtrlGroup>
          <Div />
          <CtrlGroup icon={<ALargeSmall size={13} />} tooltip="Typography variant">
            <SelectInput
              value={String(currentProps.variant ?? 'body')}
              options={VARIANT_OPTIONS}
              onChange={v => vp('variant', v)}
              width="w-24"
            />
          </CtrlGroup>
        </>
      )}

      {/* ═══ TYPEWRITER ═══ */}
      {componentName === 'Typewriter' && (
        <>
          <CtrlGroup icon={<Type size={13} />} tooltip="Source text">
            <input
              type="text"
              value={String(currentProps.text ?? '')}
              onChange={e => vp('text', e.target.value)}
              placeholder="Source text"
              className="h-7 w-32 px-2 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
            />
          </CtrlGroup>
          <Div />
          <CtrlGroup icon={<ALargeSmall size={13} />} tooltip="Typography variant">
            <SelectInput
              value={String(currentProps.variant ?? 'body')}
              options={VARIANT_OPTIONS}
              onChange={v => vp('variant', v)}
              width="w-24"
            />
          </CtrlGroup>
          <Div />
          <CtrlGroup icon={<Layers size={13} />} tooltip="Reveal mode (char/word/line)">
            <SelectInput
              value={String(currentProps.mode ?? 'char')}
              options={TYPEWRITER_MODE_OPTIONS}
              onChange={v => vp('mode', v)}
              width="w-16"
            />
          </CtrlGroup>
        </>
      )}

      {/* ═══ TITLECARD ═══ */}
      {componentName === 'TitleCard' && (
        <>
          <CtrlGroup icon={<Heading1 size={13} />} tooltip="Heading text">
            <input
              type="text"
              value={String(currentProps.heading ?? '')}
              onChange={e => vp('heading', e.target.value)}
              placeholder="Heading"
              className="h-7 w-36 px-2 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
            />
          </CtrlGroup>
          <CtrlGroup icon={<Heading2 size={13} />} tooltip="Subheading text">
            <input
              type="text"
              value={String(currentProps.subheading ?? '')}
              onChange={e => vp('subheading', e.target.value || undefined)}
              placeholder="Subheading"
              className="h-7 w-28 px-2 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
            />
          </CtrlGroup>
          <CtrlGroup icon={<Tag size={13} />} tooltip="Eyebrow label">
            <input
              type="text"
              value={String(currentProps.eyebrow ?? '')}
              onChange={e => vp('eyebrow', e.target.value || undefined)}
              placeholder="Eyebrow"
              className="h-7 w-24 px-2 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
            />
          </CtrlGroup>
        </>
      )}

      {/* ═══ COUNTER ═══ */}
      {componentName === 'Counter' && (
        <>
          <CtrlGroup icon={<Hash size={13} />} tooltip="Count from value">
            <NumberStepper
              value={Number(currentProps.from ?? 0)}
              onChange={v => vp('from', v)}
              step={1}
              inputWidth="w-14"
            />
          </CtrlGroup>
          <span className="text-xs text-muted-foreground">to</span>
          <CtrlGroup icon={<Hash size={13} />} tooltip="Count to value">
            <NumberStepper
              value={Number(currentProps.to ?? 100)}
              onChange={v => vp('to', v)}
              step={1}
              inputWidth="w-14"
            />
          </CtrlGroup>
          <Div />
          <input
            type="text"
            value={String(currentProps.prefix ?? '')}
            onChange={e => vp('prefix', e.target.value || undefined)}
            placeholder="Prefix"
            title="Text before number (e.g. $)"
            className="h-7 w-12 px-1.5 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
          />
          <input
            type="text"
            value={String(currentProps.suffix ?? '')}
            onChange={e => vp('suffix', e.target.value || undefined)}
            placeholder="Suffix"
            title="Text after number (e.g. %)"
            className="h-7 w-12 px-1.5 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
          />
        </>
      )}

      {/* ═══ WORDCYCLE ═══ */}
      {componentName === 'WordCycle' && (
        <>
          {(Array.isArray(currentProps.words) ? currentProps.words as string[] : []).map((w: string, i: number) => (
            <span
              key={i}
              className="flex items-center gap-0.5 h-6 px-2 rounded-full bg-muted border border-border text-xs text-foreground/80 shrink-0"
            >
              {w}
              <button
                onClick={() => vp('words', (currentProps.words as string[]).filter((_: string, idx: number) => idx !== i))}
                className="ml-1 hover:text-foreground text-foreground/50 transition-colors"
                title="Remove word"
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={wcDraft}
              onChange={e => setWcDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && wcDraft.trim()) {
                  vp('words', [...(currentProps.words as string[] ?? []), wcDraft.trim()])
                  setWcDraft('')
                }
              }}
              placeholder="Add word..."
              className="h-7 w-20 px-2 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
            />
            <button
              onClick={() => {
                if (!wcDraft.trim()) return
                vp('words', [...(currentProps.words as string[] ?? []), wcDraft.trim()])
                setWcDraft('')
              }}
              disabled={!wcDraft.trim()}
              title="Add word"
              className="h-7 w-7 flex items-center justify-center rounded-md border border-border bg-muted hover:bg-accent disabled:opacity-40 transition-colors"
            >
              <Plus size={12} />
            </button>
          </div>
          <Div />
          <CtrlGroup icon={<Shuffle size={13} />} tooltip="Transition animation between words">
            <SelectInput
              value={String(currentProps.transition ?? 'fadeSwap')}
              options={WORDCYCLE_TRANSITION_OPTIONS}
              onChange={v => vp('transition', v)}
              width="w-24"
            />
          </CtrlGroup>
        </>
      )}

      {/* ═══ ANIMATION TIMING (FadeIn/Out, SlideIn/Out, ScaleIn/Out) ═══ */}
      {(componentName === 'FadeIn' || componentName === 'FadeOut' ||
        componentName === 'SlideIn' || componentName === 'SlideOut' ||
        componentName === 'ScaleIn' || componentName === 'ScaleOut') && (
        <>
          <CtrlGroup icon={<Timer size={13} />} tooltip="Start frame (when animation begins)">
            <NumberStepper
              value={Number(currentProps.startAt ?? 0)}
              onChange={v => vp('startAt', v)}
              min={0} step={1} unit="f" inputWidth="w-12"
            />
          </CtrlGroup>
          <CtrlGroup icon={<Clock size={13} />} tooltip="Duration in frames">
            <NumberStepper
              value={Number(currentProps.durationInFrames ?? 30)}
              onChange={v => vp('durationInFrames', v)}
              min={1} step={1} unit="f" inputWidth="w-12"
            />
          </CtrlGroup>
          {(componentName === 'SlideIn' || componentName === 'SlideOut') && (
            <>
              <Div />
              <CtrlGroup icon={<ArrowUpDown size={13} />} tooltip="Slide direction">
                <SelectInput
                  value={String(currentProps[componentName === 'SlideIn' ? 'from' : 'to'] ?? 'bottom')}
                  options={DIRECTION_OPTIONS}
                  onChange={v => vp(componentName === 'SlideIn' ? 'from' : 'to', v)}
                  width="w-20"
                />
              </CtrlGroup>
              <CtrlGroup icon={<Ruler size={13} />} tooltip="Slide distance in pixels">
                <NumberStepper
                  value={Number(currentProps.distance ?? 100)}
                  onChange={v => vp('distance', v)}
                  min={0} step={10} unit="px" inputWidth="w-12"
                />
              </CtrlGroup>
            </>
          )}
        </>
      )}

      {/* ═══ STAGGER ═══ */}
      {componentName === 'Stagger' && (
        <>
          <CtrlGroup icon={<Timer size={13} />} tooltip="Start frame">
            <NumberStepper
              value={Number(currentProps.startAt ?? 0)}
              onChange={v => vp('startAt', v)}
              min={0} step={1} unit="f" inputWidth="w-12"
            />
          </CtrlGroup>
          <CtrlGroup icon={<GalleryHorizontalEnd size={13} />} tooltip="Delay between each child (frames)">
            <NumberStepper
              value={Number(currentProps.delayBetween ?? 12)}
              onChange={v => vp('delayBetween', v)}
              min={1} step={1} unit="f" inputWidth="w-12"
            />
          </CtrlGroup>
        </>
      )}

      {/* ═══ TIMELINEGATE ═══ */}
      {componentName === 'TimelineGate' && (
        <>
          <CtrlGroup icon={<Eye size={13} />} tooltip="Show children after this frame">
            <NumberStepper
              value={Number(currentProps.showAfter ?? 0)}
              onChange={v => vp('showAfter', v)}
              min={0} step={1} unit="f" inputWidth="w-12"
            />
          </CtrlGroup>
          <CtrlGroup icon={<EyeOff size={13} />} tooltip="Hide children after this frame">
            <NumberStepper
              value={Number(currentProps.hideAfter ?? 999)}
              onChange={v => vp('hideAfter', v)}
              min={0} step={1} unit="f" inputWidth="w-12"
            />
          </CtrlGroup>
        </>
      )}

      {/* ═══ STYLE CONTROLS (all elements) ═══ */}
      {/* Color/font controls are self-explanatory — no icons needed */}
      {(componentName || elType === 'html' || elType === 'custom') && (
        <>
          <Div />
          {/* Text color */}
          <ColorSwatch
            color={styleOverride.color ?? '#ffffff'}
            label="A"
            title="Text color"
            onChange={v => so({ color: v })}
          />
          {/* Background color */}
          <ColorSwatch
            color={styleOverride.backgroundColor ?? '#000000'}
            label="Bg"
            title="Background color"
            onChange={v => so({ backgroundColor: v })}
          />
          {/* Font weight */}
          <SelectInput
            value={String(styleOverride.fontWeight ?? '400')}
            options={FONT_WEIGHT_OPTIONS}
            onChange={v => so({ fontWeight: parseInt(v) })}
            width="w-24"
          />
          {/* Letter spacing */}
          <SelectInput
            value={String(styleOverride.letterSpacing ?? '0em')}
            options={LETTER_SPACING_OPTIONS}
            onChange={v => so({ letterSpacing: v })}
            width="w-20"
          />
          {/* Opacity */}
          <SliderInput
            value={(styleOverride.opacity as number) ?? 1}
            onChange={v => so({ opacity: v })}
            min={0} max={1} step={0.05}
            width="w-14"
          />
        </>
      )}
    </div>
  )
}
