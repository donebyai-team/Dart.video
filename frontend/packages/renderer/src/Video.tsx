import { Composition, continueRender, delayRender, getInputProps, getRemotionEnvironment } from 'remotion'
import { useEffect, useMemo, useState } from 'react'
import video from './video.json'
import Slideshow from './RemotionSlideshow'
import { loadFontRequests, type FontRequest } from './fonts'
import { FONT_WEIGHT_VALUES, TYPOGRAPHY_VARIANTS } from '@coasterai/animation'

const DEFAULT_VARIANT_WEIGHTS = Array.from(new Set(
  Object.values(TYPOGRAPHY_VARIANTS).map((variant) => String(FONT_WEIGHT_VALUES[variant.fontWeight]))
));

function getPrimaryFontFamily(fontFamily: string): string {
  const [primary = ''] = fontFamily.split(',')
  return primary.trim().replace(/^['"]|['"]$/g, '')
}

function normalizeWeight(value: unknown): string | null {
  if (typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return null
}

function collectFontRequests(
  value: unknown,
  requests: Map<string, Set<string>>,
  brandFonts: string[],
): void {
  if (!value || typeof value !== 'object') {
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectFontRequests(item, requests, brandFonts)
    }
    return
  }

  const record = value as Record<string, unknown>
  const style = record.style && typeof record.style === 'object'
    ? record.style as Record<string, unknown>
    : null

  const overriddenFamily = typeof style?.fontFamily === 'string'
    ? getPrimaryFontFamily(style.fontFamily)
    : null
  const explicitWeight = normalizeWeight(style?.fontWeight)

  const families = overriddenFamily ? [overriddenFamily] : brandFonts
  const weights = explicitWeight ? [explicitWeight] : DEFAULT_VARIANT_WEIGHTS

  if (families.length > 0) {
    for (const family of families) {
      const normalizedFamily = getPrimaryFontFamily(family)
      if (!normalizedFamily) {
        continue
      }
      const existing = requests.get(normalizedFamily) ?? new Set<string>()
      for (const weight of weights) {
        existing.add(weight)
      }
      requests.set(normalizedFamily, existing)
    }
  }

  for (const nestedValue of Object.values(record)) {
    collectFontRequests(nestedValue, requests, brandFonts)
  }
}

export const MyVideo = () => {
  const { isRendering } = getRemotionEnvironment()
  const inputProps = getInputProps() as { video?: typeof video } | undefined
  const videoData = inputProps?.video ?? video
  const [fontsReady, setFontsReady] = useState(!isRendering)
  const [renderHandle] = useState(() =>
    isRendering ? delayRender('Loading renderer fonts') : null,
  )

  //Get video FPS and total frames of video
  const fps = videoData.metadata.fps
  const totalVideoFrames = videoData.metadata.durationInFrames

  //bgm
  const backgroundAudio = videoData?.metadata?.bgAudio;
  const hasBackgroundAudio = Boolean(backgroundAudio?.url ?? videoData?.metadata?.backgroundAudioUrl);
  const backgroundMusicVolume = Math.round((backgroundAudio?.volume ?? 0.8) * 100);
  const audioVolume = hasBackgroundAudio ? backgroundMusicVolume / 100 : 0;

  // Get video resolution i.e width and height
  const width = videoData.metadata.resolution.width
  const height = videoData.metadata.resolution.height
  const fontRequests = useMemo<FontRequest[]>(() => {
    const requests = new Map<string, Set<string>>()
    const brandFonts = (videoData.metadata.generatedBranding?.brandIdentity?.fonts ?? [])
      .map((font) => font.googleFontsName || font.name)
      .filter((fontName): fontName is string => Boolean(fontName && fontName.trim()))
      .map((fontName) => getPrimaryFontFamily(fontName))

    for (const brandFont of brandFonts) {
      requests.set(brandFont, new Set(DEFAULT_VARIANT_WEIGHTS))
    }

    collectFontRequests(videoData, requests, brandFonts)

    return Array.from(requests.entries()).map(([fontName, weights]) => ({
      fontName,
      weights: Array.from(weights).sort(),
    }))
  }, [videoData])

  useEffect(() => {
    if (!isRendering) {
      return;
    }

    let disposed = false;

    loadFontRequests(fontRequests, true)
      .then(() => {
        if (!disposed) {
          setFontsReady(true)
        }
      })
      .finally(() => {
        if (!disposed && renderHandle !== null) {
          continueRender(renderHandle)
        }
      })

    return () => {
      disposed = true
    }
  }, [fontRequests, isRendering, renderHandle])

  return (
    <>
      <Composition
        id='MyComposition'
        component={Slideshow as any}
        durationInFrames={Math.ceil(totalVideoFrames)}
        fps={fps}
        width={width}
        height={height}
        defaultProps={{
          fps,
          fontsReady,
          isEditing: false, // Only enable editing when NOT playing
          onSelectTemplate: undefined,
          video: videoData,
          audioVolume: audioVolume
        }}
      /> 
    </>
  )
}
