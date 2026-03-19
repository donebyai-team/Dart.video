import React from "react";
import { preloadImage } from "@remotion/preload";
import { useEffect } from "react";
import { useRemotionEnvironment } from "remotion";
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

  const variant = theme.iconStyle ?? 'outline';
  const maskUrl = `${ICON_BASE}/${variant}/${patchedName.toLowerCase()}.svg`;
  const scaledSize = scaleToCanvas(patchedSize, preset);
  const iconColor =
    typeof styleOverride.color === 'string'
      ? styleOverride.color
      : theme.colors.foreground;

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
