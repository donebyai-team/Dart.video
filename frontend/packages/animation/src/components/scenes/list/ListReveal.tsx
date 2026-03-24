import React from 'react';
import { useTheme } from '../../../theme/ThemeContext';
import { Stagger, SlideIn, FadeIn } from '../../../core/animation_primitives';
import { resolveTypography } from '../../../tokens/resolveTypography';
import { useStyleContext, useAspectPreset } from '../../../styles';
import { SPACING_SCALE } from '../../../tokens/spacing';

export interface ListRevealProps {
  items: string[];
  perItem?: number;
  gap?: number;
  startAt?: number;
  className?: string;
}

export const ListReveal: React.FC<ListRevealProps> = ({
  items,
  perItem = 10,
  gap = 12,
  startAt = 0,
  className,
}) => {
  const theme = useTheme();
   const styleConfig = useStyleContext();
    const preset = useAspectPreset();
  const resolvedTypography = resolveTypography('subheading', styleConfig, theme, preset)
  
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: `${gap}px`,
      }}
    >
      <Stagger staggerDelay={perItem} startAt={startAt}>
        {items.map((item, index) => (
          <div key={index}>
            <SlideIn from="left" distance={30} durationInFrames={perItem}>
              <FadeIn durationInFrames={perItem}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING_SCALE[3],
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: theme.colors.primary,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: resolvedTypography.fontSize,
                      color: theme.colors.foreground,
                      lineHeight: resolvedTypography.lineHeight,
                    }}
                  >
                    {item}
                  </span>
                </div>
              </FadeIn>
            </SlideIn>
          </div>
        ))}
      </Stagger>
    </div>
  );
};