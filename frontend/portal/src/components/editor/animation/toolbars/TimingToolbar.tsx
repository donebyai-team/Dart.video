/**
 * TimingToolbar
 *
 * Shown for animation primitives: FadeIn, FadeOut, SlideIn, SlideOut, ScaleIn, ScaleOut, Stagger, TimelineGate
 *
 * Controls:
 *  - startAt (number stepper)
 *  - durationInFrames (number stepper)
 *  - direction (dropdown — SlideIn/SlideOut only)
 *  - distance (number stepper — SlideIn/SlideOut only)
 *  - showAfter/hideAfter (TimelineGate)
 *  - delayBetween (Stagger)
 */

import React from 'react'
import type { ToolbarProps } from './types'
import { NumberStepper, Sep, SelectInput } from './shared'

const DIRECTION_OPTIONS = [
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
  { label: 'Top', value: 'top' },
  { label: 'Bottom', value: 'bottom' },
]

export function TimingToolbar({
  componentName,
  currentProps,
  onValuePatch,
}: ToolbarProps) {
  const isSlide = componentName === 'SlideIn' || componentName === 'SlideOut'
  const isGate = componentName === 'TimelineGate'
  const isStagger = componentName === 'Stagger'

  const startAt = Number(currentProps.startAt ?? 0)
  const duration = Number(currentProps.durationInFrames ?? 30)

  return (
    <>
      {/* TimelineGate controls */}
      {isGate && (
        <>
          <span className="text-xs text-muted-foreground shrink-0">Show after</span>
          <NumberStepper
            value={Number(currentProps.showAfter ?? 0)}
            onChange={v => onValuePatch('showAfter', v)}
            min={0}
            step={1}
            unit="f"
            inputWidth="w-12"
          />
          <span className="text-xs text-muted-foreground shrink-0">Hide after</span>
          <NumberStepper
            value={Number(currentProps.hideAfter ?? 999)}
            onChange={v => onValuePatch('hideAfter', v)}
            min={0}
            step={1}
            unit="f"
            inputWidth="w-12"
          />
        </>
      )}

      {/* Stagger controls */}
      {isStagger && (
        <>
          <span className="text-xs text-muted-foreground shrink-0">Start</span>
          <NumberStepper
            value={startAt}
            onChange={v => onValuePatch('startAt', v)}
            min={0}
            step={1}
            unit="f"
            inputWidth="w-12"
          />
          <span className="text-xs text-muted-foreground shrink-0">Delay</span>
          <NumberStepper
            value={Number(currentProps.delayBetween ?? 12)}
            onChange={v => onValuePatch('delayBetween', v)}
            min={1}
            step={1}
            unit="f"
            inputWidth="w-12"
          />
        </>
      )}

      {/* Standard animation primitive controls */}
      {!isGate && !isStagger && (
        <>
          <span className="text-xs text-muted-foreground shrink-0">Start</span>
          <NumberStepper
            value={startAt}
            onChange={v => onValuePatch('startAt', v)}
            min={0}
            step={1}
            unit="f"
            inputWidth="w-12"
          />
          <span className="text-xs text-muted-foreground shrink-0">Duration</span>
          <NumberStepper
            value={duration}
            onChange={v => onValuePatch('durationInFrames', v)}
            min={1}
            step={1}
            unit="f"
            inputWidth="w-12"
          />

          {/* SlideIn/SlideOut: direction + distance */}
          {isSlide && (
            <>
              <Sep />
              <SelectInput
                value={String(currentProps[componentName === 'SlideIn' ? 'from' : 'to'] ?? 'bottom')}
                options={DIRECTION_OPTIONS}
                onChange={v => onValuePatch(componentName === 'SlideIn' ? 'from' : 'to', v)}
                width="w-20"
              />
              <NumberStepper
                value={Number(currentProps.distance ?? 100)}
                onChange={v => onValuePatch('distance', v)}
                min={0}
                step={10}
                unit="px"
                inputWidth="w-12"
              />
            </>
          )}
        </>
      )}
    </>
  )
}
