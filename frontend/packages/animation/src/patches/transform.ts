import type { CSSProperties } from 'react';
import { usePatchedProp } from './PatchContext';

type TransformPart = string | null | undefined | false;

export function composeTransforms(...transforms: TransformPart[]): string | undefined {
  const parts = transforms.filter((transform): transform is string => {
    if (!transform) return false;
    const trimmed = transform.trim();
    return Boolean(trimmed && trimmed !== 'none');
  });
  return parts.length > 0 ? parts.join(' ') : undefined;
}

/** 
 * @deprecated Use useElement instead.
 */
export function usePatchedDragStyle(
  id: string | undefined,
  ...baseTransforms: TransformPart[]
): Pick<CSSProperties, 'transform' | 'willChange'> {
  const dragX = usePatchedProp<number>(id, 'dragX', 0);
  const dragY = usePatchedProp<number>(id, 'dragY', 0);

  const dragTransform = dragX || dragY ? `translate(${dragX}px, ${dragY}px)` : undefined;

  const transform = composeTransforms(dragTransform, ...baseTransforms);

  return dragTransform
    ? { transform, willChange: 'transform' }
    : { transform };
}
