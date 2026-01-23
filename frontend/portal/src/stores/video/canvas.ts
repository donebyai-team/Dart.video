export const createCanvasActions = (set, get) => ({
  getEffectiveCanvasObjects() {
    const { selectedSlide } = get();
    if (!selectedSlide) return [];
    const slide = selectedSlide.slide;
    return [
      ...(slide.annotations || []),
      ...(slide.effects || []),
    ];
  },

  addEffect(effect) {
    const { sections, selectedSlide } = get();
    if (!selectedSlide) return;

    const newSections = sections.map((s) =>
      s.id === selectedSlide.section.id
        ? {
            ...s,
            slides: s.slides.map((sl) =>
              sl.id === selectedSlide.slide.id
                ? { ...sl, effects: [...(sl.effects || []), effect] }
                : sl
            ),
          }
        : s
    );

    set({
      sections: newSections,
      selectedSlide: {
        ...selectedSlide,
        slide: {
          ...selectedSlide.slide,
          effects: [...(selectedSlide.slide.effects || []), effect],
        },
      },
    });
  },

  addAnnotation(annotation) {
    const { sections, selectedSlide } = get();
    if (!selectedSlide) return;

    const newSections = sections.map((s) =>
      s.id === selectedSlide.section.id
        ? {
            ...s,
            slides: s.slides.map((sl) =>
              sl.id === selectedSlide.slide.id
                ? { ...sl, annotations: [...(sl.annotations || []), annotation] }
                : sl
            ),
          }
        : s
    );

    set({
      sections: newSections,
      selectedSlide: {
        ...selectedSlide,
        slide: {
          ...selectedSlide.slide,
          annotations: [...(selectedSlide.slide.annotations || []), annotation],
        },
      },
    });
  },

  updateEffect(effectId, updates) {
    const { sections, selectedSlide } = get();
    if (!selectedSlide) return;

    const newSections = sections.map((s) =>
      s.id === selectedSlide.section.id
        ? {
            ...s,
            slides: s.slides.map((sl) =>
              sl.id === selectedSlide.slide.id
                ? {
                    ...sl,
                    effects: (sl.effects || []).map((e) =>
                      e.id === effectId ? { ...e, ...updates } : e
                    ),
                  }
                : sl
            ),
          }
        : s
    );

    set({
      sections: newSections,
      selectedSlide: {
        ...selectedSlide,
        slide: {
          ...selectedSlide.slide,
          effects: (selectedSlide.slide.effects || []).map((e) =>
            e.id === effectId ? { ...e, ...updates } : e
          ),
        },
      },
    });
  },

  updateAnnotation(annotationId, updates) {
    const { sections, selectedSlide } = get();
    if (!selectedSlide) return;

    const newSections = sections.map((s) =>
      s.id === selectedSlide.section.id
        ? {
            ...s,
            slides: s.slides.map((sl) =>
              sl.id === selectedSlide.slide.id
                ? {
                    ...sl,
                    annotations: (sl.annotations || []).map((a) =>
                      a.id === annotationId ? { ...a, ...updates } : a
                    ),
                  }
                : sl
            ),
          }
        : s
    );

    set({
      sections: newSections,
      selectedSlide: {
        ...selectedSlide,
        slide: {
          ...selectedSlide.slide,
          annotations: (selectedSlide.slide.annotations || []).map((a) =>
            a.id === annotationId ? { ...a, ...updates } : a
          ),
        },
      },
    });
  },

  deleteEffect(effectId) {
    const { sections, selectedSlide } = get();
    if (!selectedSlide) return;

    const newSections = sections.map((s) =>
      s.id === selectedSlide.section.id
        ? {
            ...s,
            slides: s.slides.map((sl) =>
              sl.id === selectedSlide.slide.id
                ? { ...sl, effects: (sl.effects || []).filter((e) => e.id !== effectId) }
                : sl
            ),
          }
        : s
    );

    set({
      sections: newSections,
      selectedSlide: {
        ...selectedSlide,
        slide: {
          ...selectedSlide.slide,
          effects: (selectedSlide.slide.effects || []).filter((e) => e.id !== effectId),
        },
      },
      selectedObjectId: null,
    });

    get().notifyConfigChange(newSections);
  },

  deleteAnnotation(annotationId) {
    const { sections, selectedSlide } = get();
    if (!selectedSlide) return;

    const newSections = sections.map((s) =>
      s.id === selectedSlide.section.id
        ? {
            ...s,
            slides: s.slides.map((sl) =>
              sl.id === selectedSlide.slide.id
                ? {
                    ...sl,
                    annotations: (sl.annotations || []).filter((a) => a.id !== annotationId),
                  }
                : sl
            ),
          }
        : s
    );

    set({
      sections: newSections,
      selectedSlide: {
        ...selectedSlide,
        slide: {
          ...selectedSlide.slide,
          annotations: (selectedSlide.slide.annotations || []).filter(
            (a) => a.id !== annotationId
          ),
        },
      },
      selectedObjectId: null,
    });

    get().notifyConfigChange(newSections);
  },

  // Backward compatibility
  updateCanvasObject(objectId, updates) {
    const { selectedSlide } = get();
    if (!selectedSlide) return;

    const eff = selectedSlide.slide.effects?.find((e) => e.id === objectId);
    if (eff) return get().updateEffect(objectId, updates);

    const ann = selectedSlide.slide.annotations?.find((a) => a.id === objectId);
    if (ann) return get().updateAnnotation(objectId, updates);

    console.warn(`updateCanvasObject: ${objectId} not found`);
  },

  deleteCanvasObject(objectId) {
    const { selectedSlide } = get();
    if (!selectedSlide) return;

    const eff = selectedSlide.slide.effects?.find((e) => e.id === objectId);
    if (eff) return get().deleteEffect(objectId);

    const ann = selectedSlide.slide.annotations?.find((a) => a.id === objectId);
    if (ann) return get().deleteAnnotation(objectId);

    console.warn(`deleteCanvasObject: ${objectId} not found`);
  },
});
