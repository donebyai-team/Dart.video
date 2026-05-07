import { interpolate } from "remotion";

export const MEDIA_MOTION_PRESETS = [
  'none',
  'heroHover',
  'cardFlipLite',
  'spotlightDrift',
  'zoomTiltReveal',
  'orbitDrift',
] as const;

export type MediaMotionPreset =
  (typeof MEDIA_MOTION_PRESETS)[number];  

type MotionTransformResult = {
  transform: string;
  opacity: number;
};

function createOutro(progress: number) {
  const outroFlipY = interpolate(
    progress,
    [0.965, 1],
    [0, 110],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const outroScale = interpolate(
    progress,
    [0.94, 1],
    [1, 0.82],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const outroOpacity = interpolate(
    progress,
    [0.975, 1],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return {
    outroFlipY,
    outroScale,
    outroOpacity,
  };
}

function buildTransform({
  perspective = 2200,
  translateX = 0,
  translateY = 0,
  rotateX = 0,
  rotateY = 0,
  scale = 1,
}: {
  perspective?: number;
  translateX?: number;
  translateY?: number;
  rotateX?: number;
  rotateY?: number;
  scale?: number;
}) {
  return `
    perspective(${perspective}px)
    translate3d(${translateX}px, ${translateY}px, 0)
    rotateX(${rotateX}deg)
    rotateY(${rotateY}deg)
    scale(${scale})
  `;
}

export function getMotionTransform(
  motionPreset: MediaMotionPreset,
  frame: number,
  duration: number,
): MotionTransformResult {
  const progress = interpolate(frame, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const {
    outroFlipY,
    outroScale,
    outroOpacity,
  } = createOutro(progress);

  if (motionPreset === 'none') {
    return {
      transform: buildTransform({}),
      opacity: 1,
    };
  }

  // =========================================================
  // ZOOM TILT REVEAL
  // =========================================================

  if (motionPreset === 'zoomTiltReveal') {
    const scale = interpolate(
      progress,
      [0, 0.26, 0.36, 1],
      [1.9, 1.9, 1, 1],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    const translateX = interpolate(
      progress,
      [0, 0.26, 0.36, 1],
      [120, 120, -18, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    const translateY = interpolate(
      progress,
      [0, 0.36, 1],
      [18, -4, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    const rotateX = interpolate(
      progress,
      [0, 1],
      [8, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    const rotateY = interpolate(
      progress,
      [0, 0.26, 0.36, 1],
      [-38, -38, 10, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    return {
      transform: buildTransform({
        perspective: 2200,
        translateX,
        translateY,
        rotateX,
        rotateY: rotateY + outroFlipY,
        scale: scale * outroScale,
      }),
      opacity: outroOpacity,
    };
  }

  // =========================================================
  // SPOTLIGHT DRIFT
  // =========================================================

  if (motionPreset === 'spotlightDrift') {
    const scale = interpolate(
      progress,
      [0, 0.24, 0.34, 1],
      [0.72, 0.72, 1.04, 1],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    const translateX = interpolate(
      progress,
      [0, 0.24, 0.34, 1],
      [180, 180, -24, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    const translateY = interpolate(
      progress,
      [0, 0.24, 0.34, 1],
      [90, 90, -10, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    const rotateY = interpolate(
      progress,
      [0, 0.24, 0.34, 1],
      [-42, -42, 8, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    return {
      transform: buildTransform({
        perspective: 2400,
        translateX,
        translateY,
        rotateY: rotateY + outroFlipY,
        scale: scale * outroScale,
      }),
      opacity: outroOpacity,
    };
  }

  // =========================================================
  // CARD FLIP LITE
  // =========================================================

  if (motionPreset === 'cardFlipLite') {
    const scale = interpolate(
      progress,
      [0, 0.18, 0.3, 1],
      [0.8, 0.8, 1.02, 1],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    const rotateY = interpolate(
      progress,
      [0, 0.18, 0.3, 1],
      [-78, -78, 6, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    const rotateX = interpolate(
      progress,
      [0, 0.3, 1],
      [12, -4, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    return {
      transform: buildTransform({
        perspective: 1900,
        rotateX,
        rotateY: rotateY + outroFlipY,
        scale: scale * outroScale,
      }),
      opacity: outroOpacity,
    };
  }

  // =========================================================
  // HERO HOVER
  // =========================================================

  if (motionPreset === 'heroHover') {
    const scale = interpolate(
      progress,
      [0, 0.28, 0.38, 1],
      [2.2, 2.2, 1, 1],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    const translateY = interpolate(
      progress,
      [0, 0.28, 0.38, 1],
      [60, 60, -8, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    const rotateY = interpolate(
      progress,
      [0, 0.28, 0.38, 1],
      [28, 28, -6, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    return {
      transform: buildTransform({
        perspective: 2600,
        translateY,
        rotateY: rotateY + outroFlipY,
        scale: scale * outroScale,
      }),
      opacity: outroOpacity,
    };
  }

  // =========================================================
  // ORBIT DRIFT
  // =========================================================

  if (motionPreset === 'orbitDrift') {
    const scale = interpolate(
      progress,
      [0, 0.22, 0.34, 1],
      [0.7, 0.7, 1.04, 1],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    const translateX = interpolate(
      progress,
      [0, 0.22, 0.34, 1],
      [-240, -240, 30, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    const rotateY = interpolate(
      progress,
      [0, 0.22, 0.34, 1],
      [58, 58, -8, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    const rotateX = interpolate(
      progress,
      [0, 1],
      [10, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    return {
      transform: buildTransform({
        perspective: 2200,
        translateX,
        rotateX,
        rotateY: rotateY + outroFlipY,
        scale: scale * outroScale,
      }),
      opacity: outroOpacity,
    };
  }

  // =========================================================
  // DEFAULT
  // =========================================================

  return {
    transform: buildTransform({}),
    opacity: 1,
  };
}