import { calculateIconShowcaseDuration } from '../components/scenes/assets/IconShowcase';

describe('IconShowcase Duration Calculation', () => {
  it('should calculate duration with required props', () => {
    const result = calculateIconShowcaseDuration({
      icons: ['react', 'typescript', 'nodejs'],
      text: 'Our tech stack',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // 3 icons: entrance(10) + (3-1)*stagger(5) + iconAnim(10) = 10 + 10 + 10 = 30
      // Text: 3 words, delay(5) + moveUp(15) + (3-1)*5 + 15 = 5 + 15 + 10 + 15 = 45
      // Total: 30 + 45 = 75 frames
      expect(result.duration).toBe(75);
    }
  });

  it('should calculate duration with multiple icons and longer text', () => {
    const result = calculateIconShowcaseDuration({
      icons: ['react', 'typescript', 'nodejs', 'postgresql'],
      text: 'Built with modern tools',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // 4 icons: entrance(10) + (4-1)*stagger(5) + iconAnim(10) = 10 + 15 + 10 = 35
      // Text: 4 words, delay(5) + moveUp(15) + (4-1)*5 + 15 = 5 + 15 + 15 + 15 = 50
      // Total: 35 + 50 = 85 frames
      expect(result.duration).toBe(85);
    }
  });

  it('should calculate duration with single icon', () => {
    const result = calculateIconShowcaseDuration({
      icons: ['react'],
      text: 'React',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // 1 icon: entrance(10) + (1-1)*stagger(5) + iconAnim(10) = 10 + 0 + 10 = 20
      // Text: 1 word, delay(5) + moveUp(15) + (1-1)*5 + 15 = 5 + 15 + 0 + 15 = 35
      // Total: 20 + 35 = 55 frames
      expect(result.duration).toBe(55);
    }
  });

  it('should return error for empty icons array', () => {
    const result = calculateIconShowcaseDuration({
      icons: [],
      text: 'Some text',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('at least one icon is required');
      expect(result.field).toBe('icons');
    }
  });

  it('should return error for invalid icon name', () => {
    const result = calculateIconShowcaseDuration({
      icons: ['react', '', 'nodejs'],
      text: 'Some text',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });

  it('should return error for missing text', () => {
    const result = calculateIconShowcaseDuration({
      icons: ['react', 'vue'],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('text cannot be empty');
      expect(result.field).toBe('text');
    }
  });

  it('should handle optional props correctly', () => {
    const result = calculateIconShowcaseDuration({
      icons: ['react', 'vue'],
      text: 'Frontend frameworks',
      variant: 'heading',
      iconSize: 80,
      iconGap: 32,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // 2 icons: entrance(10) + (2-1)*stagger(5) + iconAnim(10) = 10 + 5 + 10 = 25
      // Text: 2 words, delay(5) + moveUp(15) + (2-1)*5 + 15 = 5 + 15 + 5 + 15 = 40
      // Total: 25 + 40 = 65 frames
      expect(result.duration).toBe(65);
    }
  });
});
