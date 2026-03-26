import { ZoomEffect, SpotlightEffect, CalloutEffect } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import React from 'react'
import { CanvasZoomEffect } from './CanvasZoomEffect'

interface CanvasEffectsLayerProps {
  zooms?: ZoomEffect[]
  spotlights?: SpotlightEffect[]
  callouts?: CalloutEffect[]
  frame: number
  fps: number
  width: number
  height: number
  slideDurationInFrames: number
  isPlaying?: boolean
  children: React.ReactNode
}

/**
 * CanvasEffectsLayer
 * Composable effects layer for AnimationSlide (or any React content).
 * Applies multiple effects in order: zoom, spotlight, callout.
 * 
 * Each effect wraps the content, allowing them to stack.
 * Effects are applied from innermost to outermost:
 * - Children (original content)
 * - Zoom (transforms the content)
 * - Spotlight (darkens/blurs outside region) - TODO
 * - Callout (highlights region with border) - TODO
 * 
 * This architecture makes it easy to add new effects by creating
 * a new Canvas*Effect component and adding it to the chain.
 */
export const CanvasEffectsLayer: React.FC<CanvasEffectsLayerProps> = ({
  zooms = [],
  spotlights = [],
  callouts = [],
  frame,
  fps,
  width,
  height,
  slideDurationInFrames,
  isPlaying = true,
  children
}) => {
  // Start with children, then wrap with each effect layer
  let content = <>{children}</>

  // Apply zoom effect (innermost - transforms the content)
  content = (
    <CanvasZoomEffect
      zooms={zooms}
      frame={frame}
      fps={fps}
      width={width}
      height={height}
      slideDurationInFrames={slideDurationInFrames}
      isPlaying={isPlaying}
    >
      {content}
    </CanvasZoomEffect>
  )

  // TODO: Apply spotlight effect (darkens/blurs outside selected region)
  // content = (
  //   <CanvasSpotlightEffect
  //     spotlights={spotlights}
  //     frame={frame}
  //     fps={fps}
  //     width={width}
  //     height={height}
  //     slideDuration={slideDuration}
  //   >
  //     {content}
  //   </CanvasSpotlightEffect>
  // )

  // TODO: Apply callout effect (highlights region with animated border)
  // content = (
  //   <CanvasCalloutEffect
  //     callouts={callouts}
  //     frame={frame}
  //     fps={fps}
  //     width={width}
  //     height={height}
  //     slideDuration={slideDuration}
  //   >
  //     {content}
  //   </CanvasCalloutEffect>
  // )

  return content
}

export default CanvasEffectsLayer
