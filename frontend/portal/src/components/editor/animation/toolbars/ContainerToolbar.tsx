import React, { useMemo } from 'react'
import {
  buildDepthShadow,
  DEFAULT_MEDIA_DEPTH,
  DEPTH_STYLE_PROPERTY,
  MAX_ELEMENT_DEPTH,
} from '@coasterai/renderer'
import { DualColorPicker } from './stylers/DualColorPicker'
import { getDepthValue, LabeledField, NumberStepper, rgbaToHex, SliderInput } from './TextToolbar'

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

function getToolbarColorValue(
  override: string | number | undefined,
  computedColor: string | undefined,
  fallback: string,
): string {
  if (typeof override === 'string') return override
  if (computedColor === 'transparent' || computedColor === 'rgba(0, 0, 0, 0)') {
    return 'transparent'
  }
  return rgbaToHex(computedColor ?? '') ?? fallback
}

export function ContainerToolbar({
  styleOverride,
  onStyleOverride,
  selectedElementId,
}: ContainerToolbarProps) {
  const computed = useComputedContainerStyles(selectedElementId)

  const backgroundColor = getToolbarColorValue(styleOverride.backgroundColor, computed.backgroundColor, '#ffffff')
  const borderColor = getToolbarColorValue(styleOverride.borderColor, computed.borderColor, '#d5d6d9')
  const borderRadius = getNumberValue(styleOverride.borderRadius, computed.borderRadius ?? 0)
  const borderWidth = getNumberValue(styleOverride.borderWidth, computed.borderWidth ?? 0)
  const padding = getNumberValue(styleOverride.padding, computed.padding ?? 0)
  const gap = getNumberValue(styleOverride.gap, computed.gap ?? 0)
  const depth = getDepthValue(styleOverride, computed, { boxOnly: true, fallbackDepth: DEFAULT_MEDIA_DEPTH })

  return (
    <div className="flex flex-wrap items-center gap-3 max-w-full">
      <LabeledField label="Fill">
        <DualColorPicker
          primaryColor={backgroundColor}
          onPrimaryColor={value => onStyleOverride({ backgroundColor: value })}
          primaryLabel="Background"
          triggerStyle="active-color"
          transparentTarget="primary"
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
        <DualColorPicker
          primaryColor={borderColor}
          onPrimaryColor={value => onStyleOverride({ borderColor: value })}
          primaryLabel="Border"
          triggerStyle="active-color"
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
