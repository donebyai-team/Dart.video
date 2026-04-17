import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { effectLayerStyle, toRgba } from './utils'

export const SweepBackground: React.FC<{
  color: string
}> = ({ color }) => {
  const frame = useCurrentFrame()
  const sweepProgress = (frame % 210) / 210
  const returnSweep = ((frame + 90) % 260) / 260
  const mainSweepX = -42 + sweepProgress * 128
  const secondarySweepX = 86 - returnSweep * 138
  const pulse = 1 + Math.sin(frame / 48) * 0.03

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        background: `radial-gradient(circle at 50% 42%, ${toRgba(color, 0.94)} 0%, ${toRgba(color, 0.97)} 48%, ${toRgba(color, 1)} 100%)`,
      }}
    >
      <div
        style={effectLayerStyle({
          inset: '-6%',
          background: `radial-gradient(circle at 50% 44%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 28%, rgba(255,255,255,0) 64%)`,
          transform: `scale(${1.04 * pulse})`,
        })}
      />
      <div
        style={effectLayerStyle({
          left: `${mainSweepX}%`,
          top: '8%',
          width: '74%',
          height: '38%',
          borderRadius: '9999px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.08) 16%, rgba(255,255,255,0.38) 46%, rgba(255,255,255,0.12) 74%, rgba(255,255,255,0) 100%)',
          filter: 'blur(82px)',
          opacity: 0.74,
          transform: `rotate(-10deg) scale(${1.08 + Math.sin(frame / 60) * 0.03}, 1)`,
        })}
      />
      <div
        style={effectLayerStyle({
          left: `${secondarySweepX}%`,
          top: '44%',
          width: '82%',
          height: '32%',
          borderRadius: '9999px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.05) 18%, rgba(255,255,255,0.22) 48%, rgba(255,255,255,0.08) 78%, rgba(255,255,255,0) 100%)',
          filter: 'blur(96px)',
          opacity: 0.56,
          transform: `rotate(8deg) scale(${1.12 + Math.cos(frame / 70) * 0.04}, 1)`,
        })}
      />
      <div
        style={effectLayerStyle({
          right: '-12%',
          top: '-12%',
          width: '58%',
          height: '74%',
          borderRadius: '9999px',
          background: `radial-gradient(circle, rgba(255,255,255,0.56) 0%, ${toRgba(color, 0.14)} 48%, rgba(255,255,255,0) 78%)`,
          filter: 'blur(120px)',
          opacity: 0.72,
          transform: `translate(${Math.cos(frame / 78) * 24}px, ${Math.sin(frame / 94) * 18}px)`,
        })}
      />
    </AbsoluteFill>
  )
}
