/**
 * Shared types for scene duration calculation
 */

export type DurationResult = 
    | {
        success: true;
        duration: number;
    }
    | {
        success: false;
        error: string;
        field?: string;
    };
