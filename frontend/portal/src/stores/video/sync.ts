import { equals, clone } from "@bufbuild/protobuf";
import { createSlideEntityId } from "@/types/selection";
import { portalClient } from "@/services/grpc";
import toast from "react-hot-toast";
import { getConnectError } from "@/utils/error";
import { Code, ConnectError } from "@connectrpc/connect";
import { Video, VideoSchema, VideoStatus } from "@coasterai/pb/coasterai/core/v1/video_pb";
import { VideoStoreSet, VideoStoreGet } from "./types";
import { getInitialSelection } from "./defaults";

const AUTO_SYNC_DELAY_MS = 1200;
const MAX_UNDO_HISTORY = 5;

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

const getComparableVideo = (video: Video | null) => {
    if (!video) {
        return null;
    }

    const comparableVideo = clone(VideoSchema, video);
    comparableVideo.version = 0 as unknown as bigint;
    return comparableVideo;
};

const hasConfigChanges = (acceptedVideoConfig: Video | null, videoConfig: Video | null) => {
    if (!acceptedVideoConfig || !videoConfig) {
        return false;
    }

    return !equals(
        VideoSchema,
        getComparableVideo(acceptedVideoConfig) as Video,
        getComparableVideo(videoConfig) as Video
    );
};

const getUndoStackWithSnapshot = (undoStack: Video[], snapshot: Video | null) => {
    if (!snapshot) {
        return undoStack;
    }

    return [...undoStack, clone(VideoSchema, snapshot)].slice(-MAX_UNDO_HISTORY);
};

const getRestoredEditorState = (videoConfig: Video, selectedSlideId?: string | null) => {
    let nextSelectedSlide = getInitialSelection(videoConfig);

    if (selectedSlideId) {
        for (const section of videoConfig.config?.sections ?? []) {
            const restoredSlide = section.slides.find(slide => slide.id === selectedSlideId);
            if (restoredSlide) {
                nextSelectedSlide = restoredSlide;
                break;
            }
        }
    }

    return {
        selectedSlide: nextSelectedSlide,
        selectedEntityId: createSlideEntityId(nextSelectedSlide?.id ?? ""),
        selectedEffectId: null,
    };
};

type SyncOptions = {
    nextUndoStack?: Video[];
    pushUndoEntry?: boolean;
};

export const createSyncActions = (set: VideoStoreSet, get: VideoStoreGet) => {
    let syncStatus: "idle" | "syncing" | "error" = "idle";
    let needsResync = false;

    const syncVideoConfig = async (options: SyncOptions = {}) => {
        const videoToAccept = get().videoConfig;
        const acceptedVideoConfig = get().acceptedVideoConfig;

        if (!videoToAccept?.id || videoToAccept.status === VideoStatus.PROCESSING) {
            return;
        }

        if (syncStatus === "syncing") {
            needsResync = true;
            return;
        }

        if (!hasConfigChanges(acceptedVideoConfig, videoToAccept)) {
            set({ hasPendingChanges: false });
            return;
        }

        try {
            syncStatus = "syncing";
            needsResync = false;
            set({ isSyncing: true });

            const updateResponse = await portalClient.updateVideoConfig({
                id: videoToAccept.id,
                config: videoToAccept.config,
                metadata: videoToAccept.metadata,
                name: videoToAccept.name,
                version: videoToAccept.version,
            });

            const nextAcceptedVideoConfig = clone(VideoSchema, videoToAccept);
            nextAcceptedVideoConfig.version = updateResponse.version;
            const currentVideoConfig = get().videoConfig;
            const nextCurrentVideoConfig = currentVideoConfig
                ? clone(VideoSchema, currentVideoConfig)
                : null;

            if (nextCurrentVideoConfig) {
                nextCurrentVideoConfig.version = updateResponse.version;
            }

            set({
                videoConfig: nextCurrentVideoConfig,
                acceptedVideoConfig: nextAcceptedVideoConfig,
                hasPendingChanges: hasConfigChanges(nextAcceptedVideoConfig, nextCurrentVideoConfig),
                isSyncing: false,
                undoStack: options.nextUndoStack ?? (
                    options.pushUndoEntry === false
                        ? get().undoStack
                        : getUndoStackWithSnapshot(get().undoStack, acceptedVideoConfig)
                ),
            });

            syncStatus = "idle";

            if (needsResync || hasConfigChanges(nextAcceptedVideoConfig, get().videoConfig)) {
                needsResync = false;
                autoSync();
            }
        } catch (error) {
            syncStatus = "error";
            set({ isSyncing: false });
            console.error("Failed to sync video config to server:", error);

            if (error instanceof ConnectError && error.code === Code.Aborted) {
                toast.error("This video was modified in another session. Refresh to load the latest version.");
            } else {
                toast.error(getConnectError(error));
            }

            throw error;
        }
    };

    const autoSync = debounce(() => {
        void syncVideoConfig();
    }, AUTO_SYNC_DELAY_MS);

    return {
        refreshPendingChanges() {
            const { videoConfig, acceptedVideoConfig } = get();
            const hasPendingChanges = hasConfigChanges(acceptedVideoConfig, videoConfig);

            set({ hasPendingChanges });

            if (hasPendingChanges) {
                autoSync();
            } else {
                autoSync.cancel?.();
            }
        },

        async acceptVideoConfigChanges() {
            autoSync.cancel?.();
            await syncVideoConfig();
        },

        discardVideoConfigChanges() {
            autoSync.cancel?.();

            const { acceptedVideoConfig, selectedSlide } = get();
            if (!acceptedVideoConfig) return;

            const restoredVideoConfig = clone(VideoSchema, acceptedVideoConfig);
            const restoredEditorState = getRestoredEditorState(restoredVideoConfig, selectedSlide?.id);

            set({
                videoConfig: restoredVideoConfig,
                hasPendingChanges: false,
                ...restoredEditorState,
            });
        },

        async undoVideoConfigChanges() {
            autoSync.cancel?.();

            const { undoStack, selectedSlide, acceptedVideoConfig } = get();
            const previousAcceptedVideoConfig = undoStack[undoStack.length - 1];
            if (!previousAcceptedVideoConfig) {
                return;
            }

            const restoredVideoConfig = clone(VideoSchema, previousAcceptedVideoConfig);
            if (acceptedVideoConfig) {
                restoredVideoConfig.version = acceptedVideoConfig.version;
            }
            const restoredEditorState = getRestoredEditorState(restoredVideoConfig, selectedSlide?.id);
            const nextUndoStack = undoStack.slice(0, -1);

            set({
                videoConfig: restoredVideoConfig,
                hasPendingChanges: true,
                ...restoredEditorState,
            });

            await syncVideoConfig({
                nextUndoStack,
                pushUndoEntry: false,
            });
        },

        getSyncStatus() {
            return syncStatus;
        },
    };
};
