import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { effectLayerStyle, toRgba } from './utils'

export const GlowBackground: React.FC<{
  color: string
}> = ({ color }) => {
  const frame = useCurrentFrame()

  const driftX = Math.sin(frame / 70) * 24
  const driftY = Math.cos(frame / 90) * 18
  const pulse = 1 + Math.sin(frame / 60) * 0.03

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',

        // Stable neutral base
        background: 'rgb(245, 246, 250)',
      }}
    >
      {/* Main color glow */}
      <div
        style={effectLayerStyle({
          left: '50%',
          top: '50%',
          width: '65%',
          height: '65%',
          borderRadius: '9999px',
          background: `
        radial-gradient(
          circle,
          ${toRgba(color, 0.80)} 0%,
          ${toRgba(color, 0.35)} 42%,
          rgba(255,255,255,0) 78%
        )
      `,
          filter: 'blur(90px)',
          opacity: 1,
          transform: `
        translate(-50%, -50%)
        translate(${driftX}px, ${driftY}px)
        scale(${pulse})
      `,
        })}
      />

      {/* Ambient top wash */}
      <div
        style={effectLayerStyle({
          inset: '-10%',
          background: `
        radial-gradient(
          circle at 50% 30%,
          rgba(255,255,255,0.7) 0%,
          ${toRgba(color, 0.05)} 50%,
          rgba(255,255,255,0) 75%
        )
      `,
          filter: 'blur(70px)',
          opacity: 0.8,
        })}
      />
    </AbsoluteFill>
  )
}
