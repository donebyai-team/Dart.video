import { calculateTextStaggerDuration } from '../components/scenes/text/TextStagger';

describe('TextStagger Duration Calculation', () => {
  it('should calculate duration with only required props', () => {
    const result = calculateTextStaggerDuration({
      text: 'Hello World Test',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // 3 words, default staggerDelay=5, default duration=15
      // Total: (3-1) * 5 + 15 = 10 + 15 = 25 frames
      expect(result.duration).toBe(25);
    }
  });

  it('should calculate duration with custom stagger and duration', () => {
    const result = calculateTextStaggerDuration({
      text: 'One Two Three Four Five',
      staggerDelay: 10,
      duration: 20,
      animation: 'slideUp',
      variant: 'heading',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // 5 words, staggerDelay=10, duration=20
      // Total: (5-1) * 10 + 20 = 40 + 20 = 60 frames
      expect(result.duration).toBe(60);
    }
  });

  it('should handle single word text', () => {
    const result = calculateTextStaggerDuration({
      text: 'Hello',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // 1 word, default staggerDelay=5, default duration=15
      // Total: (1-1) * 5 + 15 = 0 + 15 = 15 frames
      expect(result.duration).toBe(15);
    }
  });

  it('should calculate duration with splitBy char', () => {
    const result = calculateTextStaggerDuration({
      text: 'CoasterAI',
      splitBy: 'char',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // 9 characters, default staggerDelay=5, default duration=15
      // Total: (9-1) * 5 + 15 = 40 + 15 = 55 frames
      expect(result.duration).toBe(55);
    }
  });

  it('should calculate duration with splitBy char and custom delays', () => {
    const result = calculateTextStaggerDuration({
      text: 'ACME',
      splitBy: 'char',
      staggerDelay: 4,
      duration: 15,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // 4 characters, staggerDelay=4, duration=15
      // Total: (4-1) * 4 + 15 = 12 + 15 = 27 frames
      expect(result.duration).toBe(27);
    }
  });

  it('should return error for empty text', () => {
    const result = calculateTextStaggerDuration({
      text: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });
});
