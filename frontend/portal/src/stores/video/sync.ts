import { portalClient } from "@/services/grpc";
import { Section } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { VideoStoreSet, VideoStoreGet } from "./types";
import toast from "react-hot-toast";
import { getConnectError } from "@/utils/error";

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): ((...args: Parameters<T>) => void) & { cancel?: () => void } {
    let timeout: NodeJS.Timeout;
    const debounced = (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };

    debounced.cancel = () => {
        clearTimeout(timeout);
    };

    return debounced;
}

export const createSyncActions = (_: VideoStoreSet, get: VideoStoreGet) => {
    // Track sync state
    let syncStatus: 'idle' | 'syncing' | 'error' = 'idle';
    let lastSyncedSections: Section[] = [];
    let videoId: string | null = null;

    // Debounced sync function
    const debouncedSync = debounce(async (sections: Section[]) => {
        if (!videoId || syncStatus === 'syncing') return;

        // Check if sections actually changed
        if (JSON.stringify(sections) === JSON.stringify(lastSyncedSections)) {
            return;
        }

        try {
            syncStatus = 'syncing';
            console.log('Syncing sections to server...', { videoId, sectionsCount: sections.length });
           

            // Make the gRPC call
            await portalClient.updateVideoConfig({
                id: videoId,
                config: {
                    sections: sections
                }
            });

            // Update tracking
            lastSyncedSections = JSON.parse(JSON.stringify(sections));
            syncStatus = 'idle';

            console.log('Successfully synced sections to server');
        } catch (error) {
            syncStatus = 'error';
            console.error('Failed to sync sections to server:', error);
            toast.error(getConnectError(error));

            // Optionally retry after a delay
            // setTimeout(() => {
            //     if (syncStatus === 'error') {
            //         syncStatus = 'idle';
            //         debouncedSync(sections);
            //     }
            // }, 5000);
        }
    }, 500); // 500ms debounce

    return {
        // Initialize sync with video ID
        initializeSync(id: string) {
            videoId = id;
            const { sections } = get();
            lastSyncedSections = JSON.parse(JSON.stringify(sections));
            console.log('Sync initialized for video:', id);
        },

        // Trigger sync manually
        syncSections() {
            const { sections } = get();
            if (videoId && sections.length > 0) {
                debouncedSync(sections);
            }
        },

        // Auto-sync sections when they change
        autoSyncSections(sections: Section[]) {
            if (videoId && sections.length > 0) {
                debouncedSync(sections);
            }
        },

        // Get sync status
        getSyncStatus() {
            return syncStatus;
        },

        // Force sync (bypass debounce)
        forceSyncSections() {
            const { sections } = get();
            if (!videoId || !sections.length) return;

            // Clear any pending debounced calls
            debouncedSync.cancel?.();

            // Sync immediately
            return debouncedSync(sections);
        }
    };
};