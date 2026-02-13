import { portalClient } from "@/services/grpc";
import { VideoStoreSet, VideoStoreGet } from "./types";
import toast from "react-hot-toast";
import { getConnectError } from "@/utils/error";
import { equals } from "@bufbuild/protobuf"
import { Video, VideoSchema } from "@coasterai/pb/coasterai/core/v1/video_pb";

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
    let lastSyncedSections: Video;

    // Debounced sync function
    const debouncedSync = debounce(async (video: Video) => {
        const videoId = video.id;
        if (!videoId || syncStatus === 'syncing') return;
        console.log(lastSyncedSections, VideoSchema, "check")
        if (lastSyncedSections && equals(VideoSchema, lastSyncedSections, video)) {
            console.debug("No change in config, skipping sync")
            return
        }

        try {
            syncStatus = 'syncing';
            console.log('Syncing sections to server...', { videoId, sectionsCount: video.config?.sections.length });


            // Make the gRPC call
            await portalClient.updateVideoConfig({
                id: video.id,
                config: video.config,
                metadata: video.metadata,
                name: video.name
            });

            // Update tracking
            lastSyncedSections = structuredClone(video);;
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
        // Auto-sync sections when they change
        autoSyncVideoConfig() {
            const videoConfig = get().videoConfig;
            if (videoConfig && videoConfig.config) {               
                debouncedSync(videoConfig);
            } else {
                console.debug("[ERROR]", "video config is null or undefined")
            }
        },

        // Get sync status
        getSyncStatus() {
            return syncStatus;
        },
    };
};