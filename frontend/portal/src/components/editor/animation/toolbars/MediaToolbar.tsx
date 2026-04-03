import React, { useMemo } from 'react'
import { NumberStepper, SelectInput, SliderInput } from './TextToolbar'

const OBJECT_FIT_OPTIONS = [
  { label: 'Contain', value: 'contain' },
  { label: 'Cover', value: 'cover' },
  { label: 'Fill', value: 'fill' },
]

interface MediaToolbarProps {
  mediaKind?: 'image' | 'video';
  styleOverride: Record<string, string | number>
  onStyleOverride: (style: Record<string, string | number>) => void
  selectedElementId?: string
}

function useComputedMediaStyles(elementId?: string) {
  return useMemo(() => {
    if (!elementId) return {}
    const el = document.getElementById(elementId)
    if (!el) return {}
    const computed = window.getComputedStyle(el)
    return {
      objectFit: computed.objectFit as 'contain' | 'cover' | 'fill' | undefined,
      borderRadius: parseFloat(computed.borderRadius) || 0,
      boxShadow: computed.boxShadow,
    }
  }, [elementId])
}

const DEFAULT_SHADOW = 'rgba(0, 0, 0, 0.25)'
const SHADOW_SPREAD = 0
const SHADOW_Y_OFFSET = 8
const MAX_SHADOW_BLUR = 40

function parseShadowBlur(boxShadow: string | number | undefined): number {
  if (typeof boxShadow !== 'string' || boxShadow.trim() === '' || boxShadow === 'none') {
    return 0
  }

  const matches = boxShadow.match(/-?\d+(?:\.\d+)?px/g)
  if (!matches || matches.length < 3) {
    return 0
  }

  const blur = parseFloat(matches[2])
  return Number.isFinite(blur) ? blur : 0
}

function buildShadow(blur: number): string {
  if (blur <= 0) return 'none'
  return `0 ${SHADOW_Y_OFFSET}px ${blur}px ${SHADOW_SPREAD}px ${DEFAULT_SHADOW}`
}

export function MediaToolbar({
  mediaKind = 'image',
  styleOverride,
  onStyleOverride,
  selectedElementId,
}: MediaToolbarProps) {
  const computed = useComputedMediaStyles(selectedElementId)

  const currentObjectFit =
    typeof styleOverride.objectFit === 'string'
      ? styleOverride.objectFit as 'contain' | 'cover' | 'fill'
      : computed.objectFit ?? 'contain'
  const currentRadius =
    typeof styleOverride.borderRadius === 'number'
      ? styleOverride.borderRadius
      : Number(styleOverride.borderRadius) || computed.borderRadius || 0
  const currentShadow = parseShadowBlur(styleOverride.boxShadow ?? computed.boxShadow)

  return (
    <div className="flex items-center gap-3 whitespace-nowrap">
      <LabeledField label="Fit">
        <SelectInput
          value={currentObjectFit}
          options={OBJECT_FIT_OPTIONS}
          onChange={value => onStyleOverride({ objectFit: value })}
          width="w-24"
        />
      </LabeledField>

      <LabeledField label="Shadow">
        <SliderInput
          value={currentShadow}
          onChange={value => onStyleOverride({ boxShadow: buildShadow(value) })}
          min={0}
          max={MAX_SHADOW_BLUR}
          step={1}
          width="w-24"
        />
      </LabeledField>

      <LabeledField label="Radius">
        <NumberStepper
          value={currentRadius}
          onChange={value => onStyleOverride({ borderRadius: value })}
          min={0}
          step={2}
          inputWidth="w-14"
        />
      </LabeledField>
    </div>
  )
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-medium select-none">
        {label}
      </span>
      {children}
    </div>
  )
}
