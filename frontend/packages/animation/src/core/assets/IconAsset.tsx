import React from "react";
import { preloadImage } from "@remotion/preload";
import { useEffect, useState, useCallback } from "react";
import { useRemotionEnvironment, delayRender, continueRender } from "remotion";
import { usePatchedDragStyle, usePatchedProps, useStyleOverride } from "../../patches";
import { useTheme } from "../../theme";
import { useAspectPreset } from "../../styles";
import { scaleToCanvas } from "../../theme/scale";

export interface IconAssetProps {
  icon: string;
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
  const overrideTransform = typeof styleOverride.transform === 'string' ? styleOverride.transform : undefined;
  const dragStyle = usePatchedDragStyle(props.id, props.style?.transform, overrideTransform);

  const patchedIcon = props.icon;
  const patchedSize = props.size || 64;
  const patchedRadius = props.borderRadius || 0;

  const variant = theme.iconStyle ?? "outline";
  const fallbackUrl = `${ICON_BASE}/${variant}/${PLACEHOLDER_ICON}.svg`;

  const scaledSize = scaleToCanvas(patchedSize, preset);

  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [handle] = useState(() =>
    isRendering ? delayRender(`Loading icon: ${patchedIcon}`) : null
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
  }, [patchedIcon]);

  /* Preload icon during rendering */

  useEffect(() => {
    if (!isRendering || handle === null) return;

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

  const isTabler =
    patchedIcon.includes("@tabler") ||
    patchedIcon.includes("/icons/outline/") ||
    patchedIcon.includes("/icons/filled/");

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
        ...dragStyle,
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
      ) : (
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
      )}
    </div>
  );
}
