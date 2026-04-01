import { calculateAnimatedNumberDuration } from '../components/scenes/text/AnimatedNumber';

describe('AnimatedNumber Duration Calculation', () => {
  it('should calculate duration with only required props', () => {
    const result = calculateAnimatedNumberDuration({
      startText: 'Solved',
      endText: 'incidents',
      to: 12450,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // Default: from=0, animationDelay=30, range=12450
      // Counter duration: max(45, min(100, log10(12451) * 20)) ≈ 82.4
      // Total: 30 + 82.4 ≈ 112-113 frames
      expect(result.duration).toBeGreaterThan(100);
      expect(result.duration).toBeLessThan(120);
    }
  });

  it('should calculate duration with all optional props', () => {
    const result = calculateAnimatedNumberDuration({
      startText: 'Completed',
      endText: 'tasks',
      from: 100,
      to: 500,
      format: '0,0',
      variant: 'subheading',
      highlightStyle: 'marker',
      highlightColor: '#ff0000',
      entranceAnimation: 'fadeIn',
      animationDelay: 20,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // animationDelay=20, durationInFrames=60
      // Total: 20 + 60 = 80 frames
      expect(result.duration).toBe(80);
    }
  });

  it('should return error when to equals from', () => {
    const result = calculateAnimatedNumberDuration({
      startText: 'Count',
      endText: 'items',
      from: 100,
      to: 100,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('to and from cannot be the same value');
      expect(result.field).toBe('to');
    }
  });

  it('should return error for invalid props', () => {
    const result = calculateAnimatedNumberDuration({
      startText: '',
      endText: 'items',
      to: 100,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });
});
