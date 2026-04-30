import { equals, clone } from "@bufbuild/protobuf";
import { createSlideEntityId } from "@/types/selection";
import { portalClient } from "@/services/grpc";
import toast from "react-hot-toast";
import { getConnectError } from "@/utils/error";
import { VideoSchema, VideoStatus } from "@coasterai/pb/coasterai/core/v1/video_pb";
import { VideoStoreSet, VideoStoreGet } from "./types";
import { getInitialSelection } from "./defaults";

export function debounce<T extends (...args: any[]) => any>(
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

function logChanges(oldObj: Record<string, unknown> = {}, newObj: Record<string, unknown> = {}, path = "") {
    const keys = new Set([
        ...Object.keys(oldObj),
        ...Object.keys(newObj),
    ]);

    for (const key of Array.from(keys)) {
        const newPath = path ? `${path}.${key}` : key;

        const oldVal = oldObj[key];
        const newVal = newObj[key];

        if (
            oldVal &&
            newVal &&
            typeof oldVal === "object" &&
            typeof newVal === "object"
        ) {
            logChanges(oldVal as Record<string, unknown>, newVal as Record<string, unknown>, newPath);
        } else if (!Object.is(oldVal, newVal)) {
            console.log(`Changed: ${newPath}`, {
                old: oldVal,
                new: newVal,
            });
        }
    }
}

export const createSyncActions = (set: VideoStoreSet, get: VideoStoreGet) => {
    let syncStatus: 'idle' | 'syncing' | 'error' = 'idle';

    return {
        refreshPendingChanges() {
            const { videoConfig, acceptedVideoConfig } = get();
            const hasPendingChanges = Boolean(
                videoConfig &&
                acceptedVideoConfig &&
                !equals(VideoSchema, acceptedVideoConfig, videoConfig)
            );

            logChanges(acceptedVideoConfig!, videoConfig!);

            set({ hasPendingChanges });
        },

        async acceptVideoConfigChanges() {
            const videoToAccept = get().videoConfig;
            if (!videoToAccept?.id || videoToAccept.status === VideoStatus.PROCESSING || syncStatus === 'syncing') {
                return;
            }

            try {
                syncStatus = 'syncing';
                await portalClient.updateVideoConfig({
                    id: videoToAccept.id,
                    config: videoToAccept.config,
                    metadata: videoToAccept.metadata,
                    name: videoToAccept.name,
                });

                const acceptedVideoConfig = clone(VideoSchema, videoToAccept);
                const currentVideoConfig = get().videoConfig;
                set({
                    acceptedVideoConfig,
                    hasPendingChanges: Boolean(
                        currentVideoConfig &&
                        !equals(VideoSchema, acceptedVideoConfig, currentVideoConfig)
                    ),
                });

                syncStatus = 'idle';
            } catch (error) {
                syncStatus = 'error';
                console.error('Failed to sync sections to server:', error);
                toast.error(getConnectError(error));
                throw error;
            }
        },

        discardVideoConfigChanges() {
            const { acceptedVideoConfig, selectedSlide } = get();
            if (!acceptedVideoConfig) return;

            const restoredVideoConfig = clone(VideoSchema, acceptedVideoConfig);

            let nextSelectedSlide = getInitialSelection(restoredVideoConfig);
            if (selectedSlide) {
                for (const section of restoredVideoConfig.config?.sections ?? []) {
                    const restoredSlide = section.slides.find(slide => slide.id === selectedSlide.id);
                    if (restoredSlide) {
                        nextSelectedSlide = restoredSlide;
                        break;
                    }
                }
            }

            set({
                videoConfig: restoredVideoConfig,
                selectedSlide: nextSelectedSlide,
                selectedEntityId: createSlideEntityId(nextSelectedSlide?.id ?? ""),
                selectedEffectId: null,
                hasPendingChanges: false,
            });
        },

        getSyncStatus() {
            return syncStatus;
        },
    };
};
