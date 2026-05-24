import React, { useMemo } from 'react'
import {
  buildDepthShadow,
  DEFAULT_MEDIA_DEPTH,
  DEPTH_STYLE_PROPERTY,
  MAX_ELEMENT_DEPTH,
} from '@coasterai/renderer'
import { DualColorPicker } from './stylers/DualColorPicker'
import { getDepthValue, LabeledField, NumberStepper, rgbaToHex, SelectInput, SliderInput } from './TextToolbar'

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
    const mediaEl = el.querySelector('img, video')
    const mediaComputed = mediaEl ? window.getComputedStyle(mediaEl) : undefined
    return {
      objectFit: mediaComputed?.objectFit as 'contain' | 'cover' | 'fill' | undefined,
      borderColor: computed.borderColor,
      borderRadius: parseFloat(computed.borderRadius) || 0,
      borderWidth: parseFloat(computed.borderWidth) || 0,
      boxShadow: computed.boxShadow,
      depth: Number(computed.getPropertyValue(DEPTH_STYLE_PROPERTY)) || undefined,
    }
  }, [elementId])
}

function getNumberValue(value: string | number | undefined, fallback: number): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
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
  const currentBorderColor =
    (styleOverride.borderColor ?? rgbaToHex(computed.borderColor ?? '') ?? '#000000') as string
  const currentRadius =
    getNumberValue(styleOverride.borderRadius, computed.borderRadius ?? 0)
  const currentBorderWidth =
    getNumberValue(styleOverride.borderWidth, computed.borderWidth ?? 0)
  const currentDepth = getDepthValue(styleOverride, computed, { boxOnly: true, fallbackDepth: DEFAULT_MEDIA_DEPTH })

  return (
    <div className="flex flex-wrap items-center gap-3 max-w-full">
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

      <LabeledField label="Border">
        <NumberStepper
          value={currentBorderWidth}
          onChange={value => onStyleOverride({ borderWidth: value })}
          min={0}
          step={1}
          inputWidth="w-14"
        />
      </LabeledField>

      <LabeledField label="Stroke">
        <DualColorPicker
          primaryColor={currentBorderColor}
          onPrimaryColor={value => onStyleOverride({ borderColor: value })}
          primaryLabel="Stroke"
          triggerStyle="active-color"
        />
      </LabeledField>
    </div>
  )
}
