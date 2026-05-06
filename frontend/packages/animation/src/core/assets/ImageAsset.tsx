import React from "react";
import { MediaAsset } from "./MediaAsset";

export interface ImageAssetProps {
    image?: string;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    className?: string;
    id?: string;
}

export function ImageAsset({
  image,
  width,
  height,
  style,
  className,
  id,
}: ImageAssetProps): React.ReactElement {
  return (
    <MediaAsset
      src={image}
      width={width}
      height={height}
      style={style}
      className={className}
      id={id}
    />
  );
}
