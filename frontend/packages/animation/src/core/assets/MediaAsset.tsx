import { preloadImage, preloadVideo } from "@remotion/preload";
import React, { useEffect, useState } from "react";
import {
  Html5Video,
  OffthreadVideo,
  continueRender,
  delayRender,
  useRemotionEnvironment,
} from "remotion";
import { useElement } from "../../patches";
import { useAspectPreset } from "../../styles/AspectPresetContext";
import { DEFAULT_MEDIA_DEPTH, buildDepthShadow } from "../../styles/depth";

const DEFAULT_IMAGE_SVG = `data:image/svg+xml,${encodeURIComponent(`
<svg width="96" height="72" viewBox="0 0 96 72" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="72" rx="10" fill="#e2e8f0"/>
  <circle cx="30" cy="24" r="8" fill="#94a3b8"/>
  <path d="M14 56L34 38L46 48L60 30L82 56H14Z" fill="#94a3b8"/>
</svg>
`)}`;

const IMAGE_EXTENSIONS = new Set([
  "apng",
  "avif",
  "gif",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp",
]);

const VIDEO_EXTENSIONS = new Set([
  "m4v",
  "mov",
  "mp4",
  "mpeg",
  "mpg",
  "webm",
  "ogv",
]);

type MediaKind = "image" | "video";

export interface MediaAssetProps {
  // legacy, not used
  image?: string;
  video?: string;

  src?: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
}

function getPathname(src: string): string {
  try {
    return new URL(src).pathname;
  } catch {
    return src.split("?")[0]?.split("#")[0] ?? src;
  }
}

function inferMediaKind(src?: string): MediaKind {
  if (!src) {
    return "image";
  }

  // Data URLs tell us the media type directly, so prefer that before extension checks.
  if (src.startsWith("data:video/")) {
    return "video";
  }
  if (src.startsWith("data:image/")) {
    return "image";
  }

  const pathname = getPathname(src).toLowerCase();
  const extension = pathname.split(".").pop();

  if (extension && VIDEO_EXTENSIONS.has(extension)) {
    return "video";
  }
  if (extension && IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }

  return "image";
}

export function MediaAsset({
  src,
  width,
  height,
  style,
  className,
  id,
}: MediaAssetProps): React.ReactElement {
  const preset = useAspectPreset();
  const { isRendering } = useRemotionEnvironment();
  const el = useElement(id ?? "mediaasset", {
    src,
    width,
    height,
    style,
    className,
    id: id ?? "mediaasset",
  });

  const { src: resolvedSrc, width: patchedWidth, height: patchedHeight, className: patchedClassName } = el.props;
  const mediaKind = inferMediaKind(resolvedSrc);
  const mediaSrc = resolvedSrc ?? DEFAULT_IMAGE_SVG;
  const resolvedBoxWidth = patchedWidth ?? preset.width;
  const resolvedBoxHeight = patchedHeight ?? preset.height;
  const {
    objectFit,
    borderRadius = 0,
    borderWidth = 0,
    borderColor = "transparent",
    ...wrapperStyle
  } = el.style;
  const resolvedObjectFit = typeof objectFit === "string" ? objectFit : "cover";
  const innerBorderRadius = Math.max(
    Number(borderRadius) - Number(borderWidth),
    0,
  );

  // The outer wrapper owns sizing, shadow, and drag transforms; the inner media only stretches to fit it.
  const mediaStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: resolvedObjectFit,
    borderRadius: innerBorderRadius,
  };

  const [handle] = useState(() =>
    isRendering && resolvedSrc ? delayRender(`Loading ${mediaKind}`) : null,
  );

  useEffect(() => {
    if (!resolvedSrc || mediaKind !== "image") {
      return;
    }

    const img = new Image();
    img.onload = () => {
      if (handle !== null) {
        continueRender(handle);
      }
    };
    img.onerror = () => {
      if (handle !== null) {
        continueRender(handle);
      }
    };
    img.src = resolvedSrc;

    let unpreload: (() => void) | undefined;
    if (isRendering) {
      unpreload = preloadImage(resolvedSrc);
    }

    return () => {
      unpreload?.();
    };
  }, [resolvedSrc, mediaKind, isRendering, handle]);

  useEffect(() => {
    if (!resolvedSrc || mediaKind !== "video") {
      return;
    }

    // Remotion renders videos differently in studio vs final render, so we preload and unblock explicitly.
    const videoElement = document.createElement("video");
    videoElement.onloadeddata = () => {
      if (handle !== null) {
        continueRender(handle);
      }
    };
    videoElement.onerror = () => {
      if (handle !== null) {
        continueRender(handle);
      }
    };
    videoElement.src = resolvedSrc;

    let unpreload: (() => void) | undefined;
    if (isRendering) {
      unpreload = preloadVideo(resolvedSrc);
    }

    return () => {
      unpreload?.();
    };
  }, [resolvedSrc, mediaKind, isRendering, handle]);

  return (
    <span
      id={el.id}
      className={patchedClassName}
      // The editor overlay and zoom effect resolve media bounds from this wrapper.
      data-coaster-media-root="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        flexShrink: 0,
        boxSizing: "border-box",
        width: resolvedBoxWidth,
        height: resolvedBoxHeight,
        border: `${borderWidth}px solid ${String(borderColor)}`,
        backgroundColor: borderColor,
        borderRadius,
        overflow: "hidden",
        boxShadow: buildDepthShadow(DEFAULT_MEDIA_DEPTH),
        ...wrapperStyle,
        ...el.containerStyle,
      }}
    >
      <span
        // Zoom is applied here so frame sizing, border, and drag transforms stay intact.
        data-coaster-media-content="true"
        style={{
          position: "relative",
          display: "block",
          width: "100%",
          height: "100%",
          borderRadius: innerBorderRadius,
          overflow: "hidden",
          transformOrigin: "center center",
        }}
      >
        {mediaKind === "video" && resolvedSrc ? (
          isRendering ? (
            <OffthreadVideo src={resolvedSrc} style={mediaStyle} />
          ) : (
            <Html5Video src={resolvedSrc} playsInline muted style={mediaStyle} />
          )
        ) : (
          <img src={mediaSrc} style={mediaStyle} />
        )}
      </span>
    </span>
  );
}
