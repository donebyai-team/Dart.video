export const TRANSITION_DURATION_FRAMES = 15;

export function convertFramesToSeconds(frames: number, fps: number): number {
    return frames / fps;
}

export function convertSecondsToFrames(seconds: number, fps: number): number {
    return seconds * fps;
}
