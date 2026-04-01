import { calculateLogoWithBrandNameDuration } from '../components/scenes/assets/LogoWithBrandName';

describe('LogoWithBrandName Duration Calculation', () => {
  it('should calculate duration with only required props', () => {
    const result = calculateLogoWithBrandNameDuration({
      brandName: 'CoasterAI',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // 9 characters, default charStagger=4, default charFadeDuration=15
      // Total: (9-1) * 4 + 15 = 32 + 15 = 47 frames
      expect(result.duration).toBe(47);
    }
  });

  it('should calculate duration with all optional props', () => {
    const result = calculateLogoWithBrandNameDuration({
      brandName: 'ACME',
      src: 'https://example.com/logo.svg',
      logoSize: 64,
      variant: 'subheading',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // 4 characters, default charStagger=4, default charFadeDuration=15
      // Total: (4-1) * 4 + 15 = 12 + 15 = 27 frames
      expect(result.duration).toBe(27);
    }
  });

  it('should handle single character brand name', () => {
    const result = calculateLogoWithBrandNameDuration({
      brandName: 'X',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // 1 character, default charStagger=4, default charFadeDuration=15
      // Total: (1-1) * 4 + 15 = 0 + 15 = 15 frames
      expect(result.duration).toBe(15);
    }
  });

  it('should return error for empty brand name', () => {
    const result = calculateLogoWithBrandNameDuration({
      brandName: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('brandName is required');
      expect(result.field).toBe('brandName');
    }
  });
});
