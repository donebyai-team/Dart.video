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
  primaryColor?: string
  secondaryColor?: string
  fontFamily?: string
  overlayClassName?: string
}

const BrandBackgroundPreviewComposition = ({
  backgroundStyle,
  text,
  subtext,
  textColor,
  primaryColor,
  secondaryColor,
  fontFamily,
  overlayClassName,
}: BrandBackgroundPreviewCompositionProps) => {
  return (
    <BackgroundLayer backgroundStyle={backgroundStyle}>
      <AbsoluteFill
        className={cn("items-center justify-center px-12 text-center", overlayClassName)}
      >
        <div>
          <p
            className="text-7xl font-semibold tracking-tight"
            style={{
              color: textColor,
              fontFamily: fontFamily || "inherit",
            }}
          >
            {text}
          </p>
          {subtext ? (
            <p
              className="mt-4 text-3xl opacity-90"
              style={{
                color: textColor,
                fontFamily: fontFamily || "inherit",
              }}
            >
              {subtext}
            </p>
          ) : null}
          {primaryColor || secondaryColor ? (
            <div className="mt-10 flex items-center justify-center gap-5">
              {primaryColor ? (
                <span
                  className="rounded-full border border-white/20 px-6 py-3.5 text-4xl font-semibold"
                  style={{
                    color: primaryColor,
                    fontFamily: fontFamily || "inherit",
                  }}
                >
                  Primary Accent
                </span>
              ) : null}
              {secondaryColor ? (
                <span
                  className="rounded-full border border-white/20 px-6 py-3.5 text-4xl font-semibold"
                  style={{
                    color: secondaryColor,
                    fontFamily: fontFamily || "inherit",
                  }}
                >
                  Secondary Accent
                </span>
              ) : null}
            </div>
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
  primaryColor?: string
  secondaryColor?: string
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
  primaryColor,
  secondaryColor,
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
          primaryColor,
          secondaryColor,
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
