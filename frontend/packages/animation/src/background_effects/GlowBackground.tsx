import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { effectLayerStyle, toRgba } from './utils'

export const GlowBackground: React.FC<{
  color: string
}> = ({ color }) => {
  const frame = useCurrentFrame()

  // Soft cinematic floating
  const driftX = Math.sin(frame / 40) * 24
  const driftY = Math.cos(frame / 52) * 16

  const pulse = 1 + Math.sin(frame / 48) * 0.025

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',

        // Warm neutral beige background
        background: 'rgb(247, 243, 238)',
      }}
    >
      <div
        style={effectLayerStyle({
          left: '50%',
          top: '50%',

          // Smaller concentrated glow
          width: '46%',
          height: '46%',

          borderRadius: '50%',

          background: `
            radial-gradient(
              circle,

              ${toRgba(color, 0.78)} 0%,
              ${toRgba(color, 0.64)} 14%,
              ${toRgba(color, 0.44)} 32%,
              ${toRgba(color, 0.22)} 52%,
              ${toRgba(color, 0.10)} 68%,
              ${toRgba(color, 0.04)} 82%,
              rgba(247,243,238,0) 100%
            )
          `,

          // Keeps center visible while softening edges
          filter: 'blur(36px)',

          opacity: 1,

          transform: `
            translate(-50%, -50%)
            translate(${driftX}px, ${driftY}px)
            scale(${pulse})
          `,
        })}
      />
    </AbsoluteFill>
  )
}