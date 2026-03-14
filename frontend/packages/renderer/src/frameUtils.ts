export const TRANSITION_DURATION_SECONDS = 0.5;

export function convertFramesToSeconds(frames: number, fps: number): number {
    return frames / fps;
}

export function convertSecondsToFrames(seconds: number, fps: number): number {
    return seconds * fps;
}
