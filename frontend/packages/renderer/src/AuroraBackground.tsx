import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { BackgroundPattern, type BackgroundStyle } from '@coasterai/pb/coasterai/core/v1/slide_pb'

export const AURORA_PATTERN_OPACITY = 0.42

const AURORA_SENTINEL_TOLERANCE = 0.0001

export const isAuroraBackgroundStyle = (style?: BackgroundStyle | null): boolean => {
  if (style?.style?.case !== 'solid') {
    return false
  }

  return (
    style.pattern === BackgroundPattern.WAVES &&
    Math.abs((style.patternOpacity ?? 0) - AURORA_PATTERN_OPACITY) < AURORA_SENTINEL_TOLERANCE
  )
}

const hexToRgb = (hex: string) => {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!match) {
    return { r: 249, g: 115, b: 22 }
  }

  return {
    r: Number.parseInt(match[1], 16),
    g: Number.parseInt(match[2], 16),
    b: Number.parseInt(match[3], 16),
  }
}

const toRgba = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

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

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        background: `radial-gradient(circle at 50% 42%, ${toRgba(color, 0.98)} 0%, ${toRgba(color, 0.95)} 36%, ${toRgba(color, 0.9)} 58%, ${toRgba(color, 0.86)} 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          inset: '-8%',
          background: `radial-gradient(circle at ${50 + centerShiftX / 6}% ${44 + centerShiftY / 5}%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 26%, rgba(255,255,255,0) 62%)`,
          transform: `scale(${1.02 + (breathe - 1) * 0.35})`,
        }}
      />
      <AbsoluteFill
        style={{
          left: '-26%',
          top: '6%',
          width: '68%',
          height: '78%',
          borderRadius: '9999px',
          background: `radial-gradient(circle, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.42) 28%, ${toRgba(color, 0.18)} 56%, rgba(255,255,255,0) 78%)`,
          filter: 'blur(120px)',
          opacity: 0.9,
          transform: `translate(${leftX}px, ${leftY}px) scale(${1.12 * breathe})`,
        }}
      />
      <AbsoluteFill
        style={{
          right: '-24%',
          top: '10%',
          width: '74%',
          height: '82%',
          borderRadius: '9999px',
          background: `radial-gradient(circle, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.62) 24%, ${toRgba(color, 0.22)} 54%, rgba(255,255,255,0) 80%)`,
          filter: 'blur(132px)',
          opacity: 0.98,
          transform: `translate(${rightX}px, ${rightY}px) scale(${1.18 - (breathe - 1) * 0.45})`,
        }}
      />
      <AbsoluteFill
        style={{
          left: '12%',
          top: '-30%',
          width: '76%',
          height: '72%',
          borderRadius: '9999px',
          background: `radial-gradient(circle, ${toRgba(color, 0.18)} 0%, ${toRgba(color, 0.08)} 48%, rgba(255,255,255,0) 76%)`,
          filter: 'blur(110px)',
          transform: `translate(${centerShiftX}px, ${centerShiftY}px) scale(${1.06 * breathe})`,
        }}
      />
      <AbsoluteFill
        style={{
          left: '-8%',
          bottom: '-24%',
          width: '116%',
          height: '38%',
          background: `radial-gradient(ellipse at center, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.18) 26%, ${toRgba(color, 0.18)} 52%, rgba(255,255,255,0) 76%)`,
          filter: 'blur(92px)',
          opacity: 0.76,
          transform: `translate(${bottomX}px, ${bottomY}px) scaleX(${1.08 + (breathe - 1) * 0.35})`,
        }}
      />
      <AbsoluteFill
        style={{
          inset: 0,
          background: `linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 36%, rgba(0,0,0,0.08) 100%)`,
        }}
      />
    </AbsoluteFill>
  )
}
