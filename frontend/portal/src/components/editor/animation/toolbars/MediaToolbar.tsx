import React, { useMemo } from 'react'
import {
  buildDepthShadow,
  DEFAULT_MEDIA_DEPTH,
  DEPTH_STYLE_PROPERTY,
  MAX_ELEMENT_DEPTH,
  parseDepthFromShadow,
} from '@coasterai/renderer'
import { NumberStepper, SelectInput, SliderInput } from './TextToolbar'

const OBJECT_FIT_OPTIONS = [
  { label: 'Contain', value: 'contain' },
  { label: 'Cover', value: 'cover' },
  { label: 'Fill', value: 'fill' },
]

interface MediaToolbarProps {
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
      depth: Number(computed.getPropertyValue(DEPTH_STYLE_PROPERTY)) || undefined,
    }
  }, [elementId])
}

function getDepthValue(
  styleOverride: Record<string, string | number>,
  computed: { boxShadow?: string; depth?: number },
): number {
  const overrideDepth = Number(styleOverride[DEPTH_STYLE_PROPERTY])
  if (Number.isFinite(overrideDepth)) return overrideDepth

  if (styleOverride.boxShadow !== undefined) {
    return parseDepthFromShadow(styleOverride.boxShadow)
  }

  const parsedDepth = parseDepthFromShadow(styleOverride.boxShadow ?? computed.boxShadow)
  if (parsedDepth > 0) return parsedDepth

  return computed.depth ?? DEFAULT_MEDIA_DEPTH
}

export function MediaToolbar({
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
  const currentDepth = getDepthValue(styleOverride, computed)

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

      <LabeledField label="Depth">
        <SliderInput
          value={currentDepth}
          onChange={value => onStyleOverride({
            [DEPTH_STYLE_PROPERTY]: value,
            boxShadow: buildDepthShadow(value),
          })}
          min={0}
          max={MAX_ELEMENT_DEPTH}
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
