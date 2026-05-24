import React from 'react';
import { useElement } from '../../patches';

export const CardAssetDefault: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.92)',
  borderRadius: 30,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'rgba(0,0,0,0.05)',
  padding: 22,
  gap: 18,
  boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
};

export type CardAssetProps = {
  id: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export function CardAsset({ id, children, style }: CardAssetProps): React.ReactElement {
  const { style: overrideStyle } = useElement(id);

  return (
    <div
      id={id}
      style={{
        ...CardAssetDefault,
        ...style,
        ...overrideStyle,
      }}
    >
      {children}
    </div>
  );
}
