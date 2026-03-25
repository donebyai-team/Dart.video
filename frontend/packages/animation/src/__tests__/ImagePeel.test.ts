import { calculateImagePeelDuration } from '../components/scenes/assets/ImagePeel';

describe('ImagePeel Duration Calculation', () => {
  it('should calculate duration with only required props', () => {
    const result = calculateImagePeelDuration({
      sources: [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // 3 images, default holdDuration=20, default peelDuration=20
      // entrance=30, cycleDuration=40
      // Total: 30 + (3 * 40) = 30 + 120 = 150 frames
      expect(result.duration).toBe(150);
    }
  });

  it('should calculate duration with custom hold and peel durations', () => {
    const result = calculateImagePeelDuration({
      sources: [
        'https://example.com/a.jpg',
        'https://example.com/b.jpg',
      ],
      holdDuration: 30,
      peelDuration: 15,
      direction: 'left',
      borderRadius: 20,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // 2 images, holdDuration=30, peelDuration=15
      // entrance=30, cycleDuration=45
      // Total: 30 + (2 * 45) = 30 + 90 = 120 frames
      expect(result.duration).toBe(120);
    }
  });

  it('should return error for single image', () => {
    const result = calculateImagePeelDuration({
      sources: ['https://example.com/single.jpg'],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('at least 2 images');
      expect(result.field).toBe('sources');
    }
  });

  it('should return error for invalid URL', () => {
    const result = calculateImagePeelDuration({
      sources: [
        'not-a-url',
        'https://example.com/valid.jpg',
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });
});
