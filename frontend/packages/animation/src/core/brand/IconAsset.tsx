import React from "react";
import { usePatchedProp, useStyleOverride } from "../../patches";
import { useTheme } from "../../theme";
import { useAspectPreset } from "../../styles";
import { scaleToCanvas } from "../../theme/scale";

const DEFAULT_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="3" width="18" height="18" rx="2"/>
  <line x1="9" y1="9" x2="15" y2="15"/>
  <line x1="15" y1="9" x2="9" y2="15"/>
</svg>`;

const svgCache: Record<string, string> = {};

function normalizeSvgMarkup(svg: string): string {
  return svg.replace(
    /<svg\b([^>]*)>/i,
    '<svg$1 width="100%" height="100%" preserveAspectRatio="xMidYMid meet">',
  );
}

async function fetchIcon(url: string): Promise<string> {
  if (svgCache[url]) return svgCache[url];
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}`);
    const svg = normalizeSvgMarkup(await res.text());
    svgCache[url] = svg;
    return svg;
  } catch {
    console.warn(`IconAsset: failed to fetch ${url}, using default`);
    return normalizeSvgMarkup(DEFAULT_ICON_SVG);
  }
}

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
  const containerRef = React.useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const preset = useAspectPreset();
  const styleOverride = useStyleOverride(id);

  const patchedName     = usePatchedProp<string>(id, 'name', name);
  const patchedSize     = usePatchedProp<number>(id, 'size', size);
  const patchedRadius   = usePatchedProp<number | undefined>(id, 'borderRadius', borderRadius);

  const variant = theme.iconStyle ?? 'outline';
  const url = `${ICON_BASE}/${variant}/${patchedName.toLowerCase()}.svg`;

  const [svgContent, setSvgContent] = React.useState<string | null>(svgCache[url] ?? null);

  React.useEffect(() => {
    let cancelled = false;

    if (svgCache[url]) {
      setSvgContent(svgCache[url]);
    }

    fetchIcon(url).then((svg) => {
      if (!cancelled) setSvgContent(svg);
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  React.useLayoutEffect(() => {
    const svg = containerRef.current?.querySelector('svg');
    if (!(svg instanceof SVGElement)) return;

    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.display = 'block';
    svg.style.flexShrink = '0';
  }, [svgContent]);


  const scaledSize = scaleToCanvas(patchedSize, preset);
  console.log("ergrg", scaledSize, size, patchedSize)
  return (
    <div
      ref={containerRef}
      id={id}
      className={className}
      style={{
        width: scaledSize,
        height: scaledSize,
        color: theme.colors.foreground,  // always from style system
        borderRadius: patchedRadius,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        ...style,
        ...styleOverride,  // user can override color, background etc via toolbar
      }}
      dangerouslySetInnerHTML={svgContent ? { __html: svgContent } : undefined}
    />
  );
}
