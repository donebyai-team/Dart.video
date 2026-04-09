export const DEPTH_STYLE_PROPERTY = '--coaster-depth';
export const DEFAULT_MEDIA_DEPTH = 4;
export const MAX_ELEMENT_DEPTH = 10;

function formatPx(value: number): string {
  return Number.isInteger(value) ? `${value}px` : `${Number(value.toFixed(2))}px`;
}

export function buildDepthShadow(depth: number): string {
  const normalizedDepth = Math.max(0, Math.min(MAX_ELEMENT_DEPTH, depth));
  if (normalizedDepth <= 0) return 'none';

  const farY = normalizedDepth * 2.5;
  const farBlur = normalizedDepth * 5;
  const nearY = normalizedDepth * 1.5;
  const nearBlur = normalizedDepth * 3;

  return `0 ${formatPx(farY)} ${formatPx(farBlur)} rgba(0,0,0,0.25), 0 ${formatPx(nearY)} ${formatPx(nearBlur)} rgba(0,0,0,0.15)`;
}

export function buildDepthTextShadow(depth: number): string {
  const normalizedDepth = Math.max(0, Math.min(MAX_ELEMENT_DEPTH, depth));
  if (normalizedDepth <= 0) return 'none';

  const farY = normalizedDepth * 1.2;
  const farBlur = normalizedDepth * 2.4;
  const nearY = normalizedDepth * 0.7;
  const nearBlur = normalizedDepth * 1.4;

  return `0 ${formatPx(farY)} ${formatPx(farBlur)} rgba(0,0,0,0.28), 0 ${formatPx(nearY)} ${formatPx(nearBlur)} rgba(0,0,0,0.18)`;
}

export function parseDepthFromShadow(boxShadow: string | number | undefined): number {
  if (typeof boxShadow !== 'string' || boxShadow.trim() === '' || boxShadow === 'none') {
    return 0;
  }

  const lengths = boxShadow.match(/-?\d+(?:\.\d+)?px/g);
  if (!lengths || lengths.length < 3) return 0;

  const stride = lengths.length % 3 === 0 ? 3 : 4;
  const blurValues = lengths
    .map((length, index) => index % stride === 2 ? parseFloat(length) : undefined)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  const maxBlur = Math.max(...blurValues);
  return Number.isFinite(maxBlur) ? Math.round(maxBlur / 5) : 0;
}
