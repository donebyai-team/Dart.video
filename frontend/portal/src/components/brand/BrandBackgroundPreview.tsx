"use client"

import { useEffect } from "react"
import { Thumbnail } from "@remotion/player"
import { AbsoluteFill } from "remotion"

import { BackgroundLayer, loadFonts } from "@coasterai/renderer"
import { BackgroundStyle } from "@coasterai/pb/coasterai/core/v1/slide_pb"
import { cn } from "@/lib/utils"

interface BrandBackgroundPreviewCompositionProps {
  backgroundStyle?: BackgroundStyle
  text: string
  subtext?: string
  textColor: string
  fontFamily?: string
  overlayClassName?: string
}

const BrandBackgroundPreviewComposition = ({
  backgroundStyle,
  text,
  subtext,
  textColor,
  fontFamily,
  overlayClassName,
}: BrandBackgroundPreviewCompositionProps) => {
  return (
    <BackgroundLayer backgroundStyle={backgroundStyle}>
      <AbsoluteFill className="bg-black/10" />
      <AbsoluteFill
        className={cn("items-center justify-center px-12 text-center", overlayClassName)}
      >
        <div>
          <p
            className="text-6xl font-semibold tracking-tight"
            style={{
              color: textColor,
              fontFamily: fontFamily || "inherit",
            }}
          >
            {text}
          </p>
          {subtext ? (
            <p
              className="mt-3 text-2xl opacity-90"
              style={{
                color: textColor,
                fontFamily: fontFamily || "inherit",
              }}
            >
              {subtext}
            </p>
          ) : null}
        </div>
      </AbsoluteFill>
    </BackgroundLayer>
  )
}

interface BrandBackgroundPreviewProps {
  backgroundStyle?: BackgroundStyle
  text: string
  subtext?: string
  textColor: string
  fontFamily?: string
  className?: string
  overlayClassName?: string
  width?: number
  height?: number
  fps?: number
  frameToDisplay?: number
}

export default function BrandBackgroundPreview({
  backgroundStyle,
  text,
  subtext,
  textColor,
  fontFamily,
  className,
  overlayClassName,
  width = 1200,
  height = 675,
  fps = 30,
  frameToDisplay = 0,
}: BrandBackgroundPreviewProps) {
  useEffect(() => {
    if (!fontFamily) {
      return
    }

    loadFonts([fontFamily])
  }, [fontFamily])

  return (
    <div className={cn("h-full w-full overflow-hidden", className)}>
      <Thumbnail
        component={BrandBackgroundPreviewComposition as never}
        inputProps={{
          backgroundStyle,
          text,
          subtext,
          textColor,
          fontFamily,
          overlayClassName,
        }}
        durationInFrames={Math.max(frameToDisplay + 1, 30)}
        compositionWidth={width}
        compositionHeight={height}
        fps={fps}
        frameToDisplay={frameToDisplay}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  )
}
