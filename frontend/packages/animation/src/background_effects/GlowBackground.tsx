import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { effectLayerStyle, toRgba } from './utils'

export const GlowBackground: React.FC<{
  color: string
}> = ({ color }) => {
  const frame = useCurrentFrame()
  const leftDrift = Math.sin(frame / 60) * 42
  const rightDrift = Math.cos(frame / 74) * 36
  const topDrift = Math.sin(frame / 92) * 18
  const pulse = 1 + Math.sin(frame / 52) * 0.04

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        background: `radial-gradient(circle at 50% 38%, ${toRgba(color, 0.88)} 0%, ${toRgba(color, 0.92)} 44%, ${toRgba(color, 0.98)} 100%)`,
      }}
    >
      <div
        style={effectLayerStyle({
          inset: '-10%',
          background: `radial-gradient(circle at 50% 42%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 26%, rgba(255,255,255,0) 62%)`,
          transform: `scale(${1.05 * pulse})`,
        })}
      />
      <div
        style={effectLayerStyle({
          left: '-18%',
          top: '2%',
          width: '64%',
          height: '72%',
          borderRadius: '9999px',
          background: `radial-gradient(circle, rgba(255,255,255,0.82) 0%, ${toRgba(color, 0.18)} 52%, rgba(255,255,255,0) 78%)`,
          filter: 'blur(130px)',
          opacity: 0.9,
          transform: `translate(${leftDrift}px, ${topDrift}px) scale(${1.08 * pulse})`,
        })}
      />
      <div
        style={effectLayerStyle({
          right: '-14%',
          bottom: '-6%',
          width: '58%',
          height: '68%',
          borderRadius: '9999px',
          background: `radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.44) 26%, ${toRgba(color, 0.14)} 54%, rgba(255,255,255,0) 78%)`,
          filter: 'blur(144px)',
          opacity: 0.96,
          transform: `translate(${rightDrift}px, ${-topDrift * 0.7}px) scale(${1.12 - (pulse - 1) * 0.6})`,
        })}
      />
      <div
        style={effectLayerStyle({
          left: '16%',
          bottom: '-20%',
          width: '72%',
          height: '34%',
          borderRadius: '9999px',
          background: `radial-gradient(ellipse at center, rgba(255,255,255,0.36) 0%, ${toRgba(color, 0.12)} 46%, rgba(255,255,255,0) 76%)`,
          filter: 'blur(90px)',
          opacity: 0.72,
          transform: `translate(${Math.sin(frame / 68) * 18}px, ${Math.cos(frame / 88) * 14}px) scaleX(${1.06 + Math.sin(frame / 58) * 0.04})`,
        })}
      />
    </AbsoluteFill>
  )
}
