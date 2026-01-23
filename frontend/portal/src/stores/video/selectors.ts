export const createSelectors = (set, get) => ({
  getFPS() {
    const { videoConfig } = get();
    return videoConfig?.fps || 30;
  },

  setResolution: (resolution) => set({ resolution }),
});
