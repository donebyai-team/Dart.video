import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { effectLayerStyle, toRgba } from './utils'

export const AuroraBackground: React.FC<{
  color: string
}> = ({ color }) => {
  const frame = useCurrentFrame()

  const leftX = Math.sin(frame / 58) * 48
  const leftY = Math.cos(frame / 74) * 28
  const rightX = Math.cos(frame / 66) * 56
  const rightY = Math.sin(frame / 82) * 32
  const bottomX = Math.sin(frame / 64) * 34
  const bottomY = Math.cos(frame / 88) * 18
  const centerShiftX = Math.sin(frame / 92) * 16
  const centerShiftY = Math.cos(frame / 108) * 12
  const breathe = 1 + Math.sin(frame / 70) * 0.035
  const veilProgressA = (frame % 220) / 220
  const veilProgressB = ((frame + 110) % 260) / 260
  const veilProgressC = ((frame + 70) % 300) / 300

  const veilAX = -42 + veilProgressA * 120
  const veilAY = 10 + Math.sin(frame / 48) * 10
  const veilBX = 82 - veilProgressB * 132
  const veilBY = 42 + Math.cos(frame / 56) * 8
  const veilCX = -28 + veilProgressC * 108
  const veilCY = 62 + Math.sin(frame / 64) * 6

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        background: `radial-gradient(circle at 50% 42%, ${toRgba(color, 0.98)} 0%, ${toRgba(color, 0.95)} 36%, ${toRgba(color, 0.9)} 58%, ${toRgba(color, 0.86)} 100%)`,
      }}
    >
      <div
        style={effectLayerStyle({
          inset: '-8%',
          background: `radial-gradient(circle at ${50 + centerShiftX / 6}% ${44 + centerShiftY / 5}%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 26%, rgba(255,255,255,0) 62%)`,
          transform: `scale(${1.02 + (breathe - 1) * 0.35})`,
        })}
      />
      <div
        style={effectLayerStyle({
          left: '-26%',
          top: '6%',
          width: '68%',
          height: '78%',
          borderRadius: '9999px',
          background: `radial-gradient(circle, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.42) 28%, ${toRgba(color, 0.18)} 56%, rgba(255,255,255,0) 78%)`,
          filter: 'blur(120px)',
          opacity: 0.9,
          transform: `translate(${leftX}px, ${leftY}px) scale(${1.12 * breathe})`,
        })}
      />
      <div
        style={effectLayerStyle({
          right: '-24%',
          top: '10%',
          width: '74%',
          height: '82%',
          borderRadius: '9999px',
          background: `radial-gradient(circle, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.62) 24%, ${toRgba(color, 0.22)} 54%, rgba(255,255,255,0) 80%)`,
          filter: 'blur(132px)',
          opacity: 0.98,
          transform: `translate(${rightX}px, ${rightY}px) scale(${1.18 - (breathe - 1) * 0.45})`,
        })}
      />
      <div
        style={effectLayerStyle({
          left: '12%',
          top: '-30%',
          width: '76%',
          height: '72%',
          borderRadius: '9999px',
          background: `radial-gradient(circle, ${toRgba(color, 0.18)} 0%, ${toRgba(color, 0.08)} 48%, rgba(255,255,255,0) 76%)`,
          filter: 'blur(110px)',
          transform: `translate(${centerShiftX}px, ${centerShiftY}px) scale(${1.06 * breathe})`,
        })}
      />
      <div
        style={effectLayerStyle({
          left: `${veilAX}%`,
          top: `${veilAY}%`,
          width: '72%',
          height: '30%',
          borderRadius: '9999px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.08) 18%, rgba(255,255,255,0.34) 46%, rgba(255,255,255,0.12) 74%, rgba(255,255,255,0) 100%)',
          filter: 'blur(72px)',
          opacity: 0.72,
          transform: `rotate(-10deg) scale(${1.08 + Math.sin(frame / 52) * 0.04}, 1)`,
        })}
      />
      <div
        style={effectLayerStyle({
          left: `${veilBX}%`,
          top: `${veilBY}%`,
          width: '84%',
          height: '34%',
          borderRadius: '9999px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.05) 20%, rgba(255,255,255,0.22) 48%, rgba(255,255,255,0.08) 76%, rgba(255,255,255,0) 100%)',
          filter: 'blur(90px)',
          opacity: 0.52,
          transform: `rotate(8deg) scale(${1.14 + Math.cos(frame / 60) * 0.03}, 1)`,
        })}
      />
      <div
        style={effectLayerStyle({
          left: `${veilCX}%`,
          top: `${veilCY}%`,
          width: '68%',
          height: '24%',
          borderRadius: '9999px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.04) 22%, rgba(255,255,255,0.16) 50%, rgba(255,255,255,0.05) 76%, rgba(255,255,255,0) 100%)',
          filter: 'blur(82px)',
          opacity: 0.44,
          transform: 'rotate(-6deg)',
        })}
      />
      <div
        style={effectLayerStyle({
          left: '-8%',
          bottom: '-24%',
          width: '116%',
          height: '38%',
          background: `radial-gradient(ellipse at center, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.18) 26%, ${toRgba(color, 0.18)} 52%, rgba(255,255,255,0) 76%)`,
          filter: 'blur(92px)',
          opacity: 0.76,
          transform: `translate(${bottomX}px, ${bottomY}px) scaleX(${1.08 + (breathe - 1) * 0.35})`,
        })}
      />
      <div
        style={effectLayerStyle({
          inset: 0,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 36%, rgba(0,0,0,0.08) 100%)',
        })}
      />
    </AbsoluteFill>
  )
}
