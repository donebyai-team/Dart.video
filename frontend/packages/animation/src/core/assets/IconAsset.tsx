import React from "react";
import { preloadImage } from "@remotion/preload";
import { useEffect, useState } from "react";
import { useRemotionEnvironment, delayRender, continueRender } from "remotion";
import { usePatchedProp, useStyleOverride } from "../../patches";
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
const PLACEHOLDER_ICON = 'heart'; // Fallback icon name when requested icon is not found

export function IconAsset({
  name,
  size = 64,
  borderRadius,
  style,
  className,
  id,
}: IconAssetProps): React.ReactElement {
  const theme = useTheme();
  const { isRendering } = useRemotionEnvironment();
  const preset = useAspectPreset();
  const styleOverride = useStyleOverride(id);

  const patchedName = usePatchedProp<string>(id, 'name', name);
  const patchedSize = usePatchedProp<number>(id, 'size', size);
  const patchedRadius = usePatchedProp<number | undefined>(id, 'borderRadius', borderRadius);

  const [iconExists, setIconExists] = useState(true);
  const [handle] = useState(() => isRendering ? delayRender('Loading icon') : null);
  const variant = theme.iconStyle ?? 'outline';
  const requestedMaskUrl = `${ICON_BASE}/${variant}/${patchedName.toLowerCase()}.svg`;
  const fallbackMaskUrl = `${ICON_BASE}/${variant}/${PLACEHOLDER_ICON}.svg`;
  const maskUrl = iconExists ? requestedMaskUrl : fallbackMaskUrl;
  
  const scaledSize = scaleToCanvas(patchedSize, preset);
  const iconColor =
    typeof styleOverride.color === 'string'
      ? styleOverride.color
      : theme.colors.foreground;

  // Check if icon exists and load it
  useEffect(() => {
    // Reset state when checking new icon
    setIconExists(true);
    
    // Try to load the requested icon
    const img = new Image();
    img.onload = () => {
      setIconExists(true);
      if (handle !== null) {
        continueRender(handle);
      }
    };
    img.onerror = () => {
      console.warn(`Icon "${patchedName}" not found at ${requestedMaskUrl}, using placeholder`);
      setIconExists(false);
      // Load fallback icon before continuing
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        if (handle !== null) {
          continueRender(handle);
        }
      };
      fallbackImg.onerror = () => {
        if (handle !== null) {
          continueRender(handle);
        }
      };
      fallbackImg.src = fallbackMaskUrl;
    };
    img.src = requestedMaskUrl;
  }, [requestedMaskUrl, patchedName, handle, fallbackMaskUrl]);

  // Preload the icon that will be used (only during rendering)
  useEffect(() => {
    if (!isRendering) return;
    const unpreload = preloadImage(maskUrl);
    return () => {
      unpreload();
    };
  }, [isRendering, maskUrl]);

  return (
    <div
      id={id}
      className={className}
      style={{
        width: scaledSize,
        height: scaledSize,
        borderRadius: patchedRadius,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        ...style,
        ...styleOverride,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: iconColor,
          maskImage: `url("${maskUrl}")`,
          WebkitMaskImage: `url("${maskUrl}")`,
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
        }}
      />
    </div>
  );
}
