import React from "react";
import { preloadImage } from "@remotion/preload";
import { useEffect, useState, useCallback } from "react";
import { useRemotionEnvironment, delayRender, continueRender } from "remotion";
import { usePatchedProps, useStyleOverride } from "../../patches";
import { useTheme } from "../../theme";
import { useAspectPreset } from "../../styles";
import { scaleToCanvas } from "../../theme/scale";
import { Icon } from "../../components/scenes";

export interface IconAssetProps {
  icon: Icon;
  size?: number;
  width?: number;
  height?: number;
  background?: string;
  borderRadius?: number;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
}

const ICON_BASE = "https://storage.googleapis.com/coasterai-public/icons";
const PLACEHOLDER_ICON = "heart";

export function IconAsset(propsInit: IconAssetProps): React.ReactElement {
  const theme = useTheme();
  const { isRendering } = useRemotionEnvironment();
  const preset = useAspectPreset();

  const styleOverride = useStyleOverride(propsInit.id);
  const patchedProps = usePatchedProps(propsInit.id, propsInit);
  const props = { ...patchedProps, id: propsInit.id };

  const patchedIcon = props.icon;
  const patchedSize = props.size || 64;
  const patchedRadius = props.borderRadius || 0;

  const variant = theme.iconStyle ?? "outline";
  const iconUrl = patchedIcon.icon;
  const fallbackUrl = `${ICON_BASE}/${variant}/${PLACEHOLDER_ICON}.svg`;

  const scaledSize = scaleToCanvas(patchedSize, preset);

  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [handle] = useState(() =>
    isRendering ? delayRender("Loading icon") : null
  );

  const onLoad = useCallback(() => {
    setLoaded(true);
    if (handle !== null) continueRender(handle);
  }, [handle]);

  const onError = useCallback(() => {
    console.warn(`Icon "${patchedIcon.name}" not found at ${iconUrl}`);
    setErrored(true);
    if (handle !== null) continueRender(handle);
  }, [handle, patchedIcon.name, iconUrl]);

  /* Reset when icon changes */

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [iconUrl]);

  /* Preload icon during rendering */

  useEffect(() => {
    if (!isRendering) return;
    const unpreload = preloadImage(iconUrl);
    return () => {
      unpreload();
    };
  }, [isRendering, iconUrl]);

  /* Detect Tabler icon */

  const isTabler =
    iconUrl.includes("@tabler") ||
    iconUrl.includes("/icons/outline/") ||
    iconUrl.includes("/icons/filled/");

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
        ...props.style,
        ...styleOverride,
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
      ) : isTabler ? (
        /* Tabler icon → colorable mask */

        <div
          onLoad={onLoad}
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "currentColor",
            WebkitMaskImage: `url(${iconUrl})`,
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            WebkitMaskSize: "contain",

            maskImage: `url(${iconUrl})`,
            maskRepeat: "no-repeat",
            maskPosition: "center",
            maskSize: "contain",
          }}
        />
      ) : (
        /* Brand icon → normal image */

        <img
          src={iconUrl}
          alt={patchedIcon.name}
          onLoad={onLoad}
          onError={onError}
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