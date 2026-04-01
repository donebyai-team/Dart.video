import React from "react";
import { preloadImage } from "@remotion/preload";
import { useEffect, useState, useCallback } from "react";
import { useRemotionEnvironment, delayRender, continueRender } from "remotion";
import { usePatchedProps, useStyleOverride } from "../../patches";
import { useTheme } from "../../theme";
import { useAspectPreset } from "../../styles";
import { scaleToCanvas } from "../../theme/scale";

export interface IconAssetProps {
  name: string;
  size?: number;
  width?: number;
  height?: number;
  color?: string;
  background?: string;
  borderRadius?: number;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
}

const ICON_BASE = 'https://storage.googleapis.com/coasterai-public/icons';
// const ICON_BASE = 'https://www.thesvg.org/icons'
const PLACEHOLDER_ICON = 'heart';

export function IconAsset(propsInit: IconAssetProps): React.ReactElement {
  const theme = useTheme();
  const { isRendering } = useRemotionEnvironment();
  const preset = useAspectPreset();

  const styleOverride = useStyleOverride(propsInit.id);
  const patchedProps = usePatchedProps(propsInit.id, propsInit);
  const props = { ...patchedProps, id: propsInit.id };


  const patchedName = props.name;
  const patchedSize = props.size || 64;
  const patchedRadius = props.borderRadius || 0;

  const variant = theme.iconStyle ?? 'outline';
  const maskUrl = `${ICON_BASE}/${variant}/${patchedName.toLowerCase()}.svg`;
  const fallbackUrl = `${ICON_BASE}/${variant}/${PLACEHOLDER_ICON}.svg`;

  const scaledSize = scaleToCanvas(patchedSize, preset);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [handle] = useState(() => isRendering ? delayRender('Loading icon') : null);

  const onLoad = useCallback(() => {
    setLoaded(true);
    if (handle !== null) continueRender(handle);
  }, [handle]);

  const onError = useCallback(() => {
    console.warn(`Icon "${patchedName}" not found at ${maskUrl}`);
    setErrored(true);
    if (handle !== null) continueRender(handle);
  }, [handle, patchedName, maskUrl]);

  // Reset state when icon changes
  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [maskUrl]);

  // Preload the icon during rendering
  useEffect(() => {
    if (!isRendering) return;
    const unpreload = preloadImage(maskUrl);
    return () => {
      unpreload();
    };
  }, [isRendering, maskUrl]);

  return (
    <div
      id={props.id}
      className={props.className}
      style={{
        width: scaledSize,
        height: scaledSize,
        borderRadius: patchedRadius,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        color: "#000",
        ...props.style,
        ...styleOverride,
      }}
    >
      {errored ? (
        <img
          src={fallbackUrl}
          alt="placeholder"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      ) : (
        <img
          src={maskUrl}
          alt={patchedName}
          onLoad={onLoad}
          onError={onError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      )}
    </div>
  );
}
