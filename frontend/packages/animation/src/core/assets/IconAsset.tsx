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
  icon?: string;
  Icon?: LucideIcon;
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
    name: 'icon',
    type: 'string',
    datatype: "icon",
  },
];

const ICON_BASE = "https://storage.googleapis.com/coasterai-public/icons";
const PLACEHOLDER_ICON = "heart";

export function IconAsset(propsInit: IconAssetProps): React.ReactElement {
  const theme = useTheme();
  const { isRendering } = useRemotionEnvironment();
  const preset = useAspectPreset();

  const { props, style, containerStyle} = useElement(propsInit.id!, propsInit)

  const patchedIcon = typeof props.icon === "string" ? props.icon : "";
  const PatchedLucideIcon = props.Icon;
  const iconSourceLabel = patchedIcon || PatchedLucideIcon?.displayName || PatchedLucideIcon?.name || PLACEHOLDER_ICON;
  const patchedSize = props.size || 64;
  const patchedRadius = props.borderRadius || 0;

  const variant = theme.iconStyle ?? "outline";
  const color = theme.colors.foreground;
  const fallbackUrl = `${ICON_BASE}/${variant}/${PLACEHOLDER_ICON}.svg`;

  const scaledSize = scaleToCanvas(patchedSize, preset);

  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [handle] = useState(() =>
    isRendering ? delayRender(`Loading icon: ${iconSourceLabel}`) : null
  );

  const onLoad = useCallback(() => {
    setLoaded(true);
    if (handle !== null) continueRender(handle);
  }, [handle]);

  const onError = useCallback(() => {
    console.warn(`Icon not found at ${patchedIcon}`);
    setErrored(true);
    if (handle !== null) continueRender(handle);
  }, [handle, patchedIcon]);

  /* Reset when icon changes */

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [patchedIcon, PatchedLucideIcon]);

  /* Preload icon during rendering */

  useEffect(() => {
    if (!isRendering || handle === null) return;

    if (!patchedIcon) {
      setLoaded(true);
      continueRender(handle);
      return;
    }

    const img = new Image();
    img.src = patchedIcon;

    img.onload = () => {
      setLoaded(true);
      continueRender(handle);
    };

    img.onerror = () => {
      setErrored(true);
      continueRender(handle);
    };
  }, [isRendering, patchedIcon, handle]);

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
          src={patchedIcon}
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
