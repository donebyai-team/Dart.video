import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LogoAsset } from '../core/brand/LogoAsset';
import { PatchContextProvider } from '../patches/PatchContext';
import { createEmptyPatchOverlay, applyValuePatches } from '../patches/types';
import { AspectPreset, AspectPresetProvider, ASPECT_PRESETS } from '../styles/AspectPresetContext';
import { ThemeProvider } from '../theme';
import { BrandTheme } from '../theme/types';

function renderLogo({
  theme,
  width,
  height,
  id,
  preset = ASPECT_PRESETS.web,
  overlay = createEmptyPatchOverlay(),
}: {
  theme: BrandTheme;
  width?: number;
  height?: number;
  id?: string;
  preset?: AspectPreset;
  overlay?: ReturnType<typeof createEmptyPatchOverlay>;
}): string {
  return renderToStaticMarkup(
    <PatchContextProvider overlay={overlay}>
      <AspectPresetProvider preset={preset}>
        <ThemeProvider theme={theme}>
          <LogoAsset id={id} width={width} height={height} />
        </ThemeProvider>
      </AspectPresetProvider>
    </PatchContextProvider>,
  );
}

describe('LogoAsset', () => {
  const baseTheme: BrandTheme = {
    primary: '#111111',
    secondary: '#222222',
    bg: '#ffffff',
    text: '#000000',
  };

  it('renders raster logos into the default bounded box with intrinsic metadata', () => {
    const html = renderLogo({
      theme: {
        ...baseTheme,
        logo: {
          url: 'https://example.com/logo.png',
          width: 400,
          height: 100,
        },
      },
    });

    expect(html).toContain('width:216px');
    expect(html).toContain('height:216px');
    expect(html).toContain('width="400"');
    expect(html).toContain('height="100"');
    expect(html).toMatch(/aspect-ratio:\s*400\s*\/\s*100/);
  });

  it('renders svg logos with zero metadata inside the default bounded box', () => {
    const html = renderLogo({
      theme: {
        ...baseTheme,
        logo: {
          url: 'https://example.com/logo.svg',
          width: 0,
          height: 0,
        },
      },
    });

    expect(html).toContain('width:216px');
    expect(html).toContain('height:216px');
    expect(html).toContain('src="https://example.com/logo.svg"');
    expect(html).not.toContain('width="0"');
    expect(html).not.toContain('height="0"');
  });

  it('uses a square wrapper when only width is provided', () => {
    const html = renderLogo({
      theme: baseTheme,
      width: 180,
    });

    expect(html).toContain('width:180px');
    expect(html).toContain('height:180px');
    expect(html).toContain('object-fit:contain');
  });

  it('uses a square wrapper when only height is provided', () => {
    const html = renderLogo({
      theme: baseTheme,
      height: 140,
    });

    expect(html).toContain('width:140px');
    expect(html).toContain('height:140px');
  });

  it('uses the provided bounding box when both width and height are set', () => {
    const html = renderLogo({
      theme: baseTheme,
      width: 300,
      height: 120,
    });

    expect(html).toContain('width:300px');
    expect(html).toContain('height:120px');
    expect(html).toContain('object-fit:contain');
  });

  it('uses the same deterministic sizing path for the placeholder logo', () => {
    const html = renderLogo({
      theme: baseTheme,
      preset: {
        id: 'small',
        width: 500,
        height: 400,
        safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      },
    });

    expect(html).toContain('width:160px');
    expect(html).toContain('height:160px');
    expect(html).toContain('src="data:image/svg+xml');
  });

  it('lets patched props override direct width and height props', () => {
    const overlay = applyValuePatches(createEmptyPatchOverlay(), 'logo-1', {
      width: 180,
      height: 90,
    });

    const html = renderLogo({
      theme: baseTheme,
      id: 'logo-1',
      width: 300,
      height: 200,
      overlay,
    });

    expect(html).toContain('width:180px');
    expect(html).toContain('height:90px');
    expect(html).not.toContain('width:300px');
    expect(html).not.toContain('height:200px');
  });
});
