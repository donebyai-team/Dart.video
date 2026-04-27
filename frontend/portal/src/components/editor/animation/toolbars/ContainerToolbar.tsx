import React, { useMemo } from 'react'
import {
  buildDepthShadow,
  DEFAULT_MEDIA_DEPTH,
  DEPTH_STYLE_PROPERTY,
  MAX_ELEMENT_DEPTH,
} from '@coasterai/renderer'
import { ColorSwatch, getDepthValue, LabeledField, NumberStepper, rgbaToHex, SliderInput } from './TextToolbar'

interface ContainerToolbarProps {
  styleOverride: Record<string, string | number>
  onStyleOverride: (style: Record<string, string | number>) => void
  selectedElementId?: string
}

function useComputedContainerStyles(elementId?: string) {
  return useMemo(() => {
    if (!elementId) return {}
    const el = document.getElementById(elementId)
    if (!el) return {}
    const computed = window.getComputedStyle(el)
    return {
      backgroundColor: computed.backgroundColor,
      borderColor: computed.borderColor,
      borderRadius: parseFloat(computed.borderRadius) || 0,
      borderWidth: parseFloat(computed.borderWidth) || 0,
      padding: parseFloat(computed.paddingTop) || 0,
      gap: parseFloat(computed.gap) || 0,
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

export function ContainerToolbar({
  styleOverride,
  onStyleOverride,
  selectedElementId,
}: ContainerToolbarProps) {
  const computed = useComputedContainerStyles(selectedElementId)

  const backgroundColor = (styleOverride.backgroundColor ?? rgbaToHex(computed.backgroundColor ?? '') ?? '#ffffff') as string
  const borderColor = (styleOverride.borderColor ?? rgbaToHex(computed.borderColor ?? '') ?? '#d5d6d9') as string
  const borderRadius = getNumberValue(styleOverride.borderRadius, computed.borderRadius ?? 0)
  const borderWidth = getNumberValue(styleOverride.borderWidth, computed.borderWidth ?? 0)
  const padding = getNumberValue(styleOverride.padding, computed.padding ?? 0)
  const gap = getNumberValue(styleOverride.gap, computed.gap ?? 0)
  const depth = getDepthValue(styleOverride, computed, { boxOnly: true, fallbackDepth: DEFAULT_MEDIA_DEPTH })

  return (
    <div className="flex flex-wrap items-center gap-3 max-w-full">
      <LabeledField label="Fill">
        <ColorSwatch
          color={backgroundColor}
          label=""
          title="Background color"
          onChange={value => onStyleOverride({ backgroundColor: value })}
        />
      </LabeledField>

      <LabeledField label="Depth">
        <SliderInput
          value={depth}
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
          value={borderRadius}
          onChange={value => onStyleOverride({ borderRadius: value })}
          min={0}
          step={2}
          inputWidth="w-14"
        />
      </LabeledField>

      <LabeledField label="Border">
        <NumberStepper
          value={borderWidth}
          onChange={value => onStyleOverride({ borderWidth: value })}
          min={0}
          step={1}
          inputWidth="w-14"
        />
      </LabeledField>

      <LabeledField label="Stroke">
        <ColorSwatch
          color={borderColor}
          label=""
          title="Border color"
          onChange={value => onStyleOverride({ borderColor: value })}
        />
      </LabeledField>

      <LabeledField label="Padding">
        <NumberStepper
          value={padding}
          onChange={value => onStyleOverride({ padding: value })}
          min={0}
          step={2}
          inputWidth="w-14"
        />
      </LabeledField>

      <LabeledField label="Gap">
        <NumberStepper
          value={gap}
          onChange={value => onStyleOverride({ gap: value })}
          min={0}
          step={2}
          inputWidth="w-14"
        />
      </LabeledField>
    </div>
  )
}
