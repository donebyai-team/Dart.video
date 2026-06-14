import React from "react";
import { useEffect, useState, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import { useRemotionEnvironment, delayRender, continueRender } from "remotion";
import { useElement } from "../../patches";
import { useTheme } from "../../theme";
import { useAspectPreset } from "../../styles";
import { scaleToCanvas } from "../../theme/scale";
import { FieldSchema } from "../../registry/types";

export interface IconAssetProps {
  /** @deprecated Use `Icon` instead. */
  icon?: string;
  Icon?: LucideIcon | string;
  size?: number;
  width?: number;
  height?: number;
  background?: string;
  borderRadius?: number;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
}

export const IconAssetFieldSchema: FieldSchema[] = [
  {
    name: 'Icon',
    type: 'string',
    datatype: "icon",
  },
  {
    name: 'size',
    type: 'number',
  },
];

const ICON_BASE = "https://storage.googleapis.com/coasterai-public/icons";
const LUCIDE_CDN_BASE = "https://cdn.jsdelivr.net/npm/lucide-static@latest/icons";
const PLACEHOLDER_ICON = "heart";

const toKebabCase = (value: string): string => value
  .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
  .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
  .replace(/([a-zA-Z])([0-9])/g, "$1-$2")
  .replace(/([0-9])([a-zA-Z])/g, "$1-$2")
  .toLowerCase();

export function IconAsset(propsInit: IconAssetProps): React.ReactElement {
  const theme = useTheme();
  const { isRendering } = useRemotionEnvironment();
  const preset = useAspectPreset();

  const { props, style, containerStyle } = useElement(propsInit.id!, propsInit)

  const resolvedIcon = props.Icon ?? props.icon;
  const patchedIcon = typeof resolvedIcon === "string" ? resolvedIcon : "";
  const PatchedLucideIcon = typeof resolvedIcon === "string" ? undefined : resolvedIcon;
  const iconSourceLabel = patchedIcon || PatchedLucideIcon?.displayName || PatchedLucideIcon?.name || PLACEHOLDER_ICON;
  const patchedSize = props.size || 64;
  const patchedRadius = props.borderRadius || 0;

  const variant = theme.iconStyle ?? "outline";
  const color = theme.colors.foreground;
  const fallbackUrl = `${ICON_BASE}/${variant}/${PLACEHOLDER_ICON}.svg`;
  const isLikelyLucideName = /^[A-Z][A-Za-z0-9]*$/.test(patchedIcon);
  /* Assumption: a bare PascalCase string like `Heart` or `ArrowRight` is intended
     to reference a Lucide icon name, so we first try the matching Lucide CDN asset
     before falling back to the original string as an image/file source. */
  const lucideStringUrl = isLikelyLucideName
    ? `${LUCIDE_CDN_BASE}/${toKebabCase(patchedIcon)}.svg`
    : "";

  const scaledSize = scaleToCanvas(patchedSize, preset);

  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [stringIconSrc, setStringIconSrc] = useState(() => lucideStringUrl || patchedIcon);
  const [didFallbackFromLucideName, setDidFallbackFromLucideName] = useState(false);
  const [handle] = useState(() =>
    isRendering ? delayRender(`Loading icon: ${iconSourceLabel}`) : null
  );

  const onLoad = useCallback(() => {
    setLoaded(true);
    if (handle !== null) continueRender(handle);
  }, [handle]);

  const onError = useCallback(() => {
    if (lucideStringUrl && !didFallbackFromLucideName && stringIconSrc !== patchedIcon && patchedIcon) {
      /* If our PascalCase -> Lucide assumption was wrong, fall back to the original
         string so existing file/image inputs keep working without importing all icons. */
      console.warn(`Lucide icon not found for ${patchedIcon}, falling back to original string source`);
      setDidFallbackFromLucideName(true);
      setStringIconSrc(patchedIcon);
      return;
    }

    console.warn(`Icon not found at ${stringIconSrc || patchedIcon}`);
    setErrored(true);
    if (handle !== null) continueRender(handle);
  }, [didFallbackFromLucideName, handle, lucideStringUrl, patchedIcon, stringIconSrc]);

  /* Reset when icon changes */

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
    setDidFallbackFromLucideName(false);
    setStringIconSrc(lucideStringUrl || patchedIcon);
  }, [patchedIcon, PatchedLucideIcon, lucideStringUrl]);

  /* Preload icon during rendering */

  useEffect(() => {
    if (!isRendering || handle === null) return;

    if (!stringIconSrc) {
      setLoaded(true);
      continueRender(handle);
      return;
    }

    const img = new Image();
    img.src = stringIconSrc;

    img.onload = () => {
      setLoaded(true);
      continueRender(handle);
    };

    img.onerror = () => {
      if (lucideStringUrl && !didFallbackFromLucideName && stringIconSrc !== patchedIcon && patchedIcon) {
        setDidFallbackFromLucideName(true);
        setStringIconSrc(patchedIcon);
        return;
      }

      setErrored(true);
      continueRender(handle);
    };
  }, [didFallbackFromLucideName, handle, isRendering, lucideStringUrl, patchedIcon, stringIconSrc]);

  /* Detect Tabler icon */

  const hasStringIcon = patchedIcon.length > 0;
  const hasLucideIcon = !hasStringIcon && !!PatchedLucideIcon;
  const isTabler = hasStringIcon && (
    patchedIcon.includes("@tabler") ||
    patchedIcon.includes("/icons/outline/") ||
    patchedIcon.includes("/icons/filled/")
  );

  return (
    <div
      id={props.id}
      className={props.className}
      style={{
        width: scaledSize,
        height: scaledSize,
        borderRadius: patchedRadius,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
        color: color,
        ...style,
        ...containerStyle,
      }}
    >
      {errored ? (
        <img
          src={fallbackUrl}
          alt="placeholder"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      ) : hasLucideIcon ? (
        <PatchedLucideIcon
          size={scaledSize}
          color="currentColor"
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      ) : isTabler ? (
        /* Tabler icon → colorable mask */

        <div
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "currentColor",
            WebkitMaskImage: `url(${patchedIcon})`,
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            WebkitMaskSize: "contain",

            maskImage: `url(${patchedIcon})`,
            maskRepeat: "no-repeat",
            maskPosition: "center",
            maskSize: "contain",
          }}
        />
      ) : hasStringIcon ? (
        /* Brand icon → normal image */

        <img
          src={stringIconSrc}
          alt={patchedIcon}
          onLoad={onLoad}
          onError={onError}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      ) : (
        <img
          src={fallbackUrl}
          alt="placeholder"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      )}
    </div>
  );
}
