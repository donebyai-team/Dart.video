import { AnnotationObject, SlideEffect, SpotlightEffect } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { VideoStoreGet, VideoStoreSet } from "./types";

export const createCanvasActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
  getEffectiveCanvasObjects: () => {
    const { selectedSlide } = get();
    if (!selectedSlide) return [];

    const slide = selectedSlide.slide;

    const effects: SlideEffect[] = slide.effects ?? [];
    const annotations: AnnotationObject[] = slide.annotations ?? [];

    return effects
  },

  addEffect(effect: SlideEffect) {
    const { sections, selectedSlide } = get();
    if (!selectedSlide?.slide || !selectedSlide?.section) return;

    const newSections = sections.map((s) =>
      s.id === selectedSlide.section!.id
        ? {
          ...s,
          slides: s.slides.map((sl) =>
            sl.id === selectedSlide.slide!.id
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

  addAnnotation(annotation: AnnotationObject) {
    const { sections, selectedSlide } = get();
    if (!selectedSlide?.slide || !selectedSlide?.section) return;

    const newSections = sections.map((s) =>
      s.id === selectedSlide.section!.id
        ? {
          ...s,
          slides: s.slides.map((sl) =>
            sl.id === selectedSlide.slide!.id
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

  updateEffect(effectId: string, updates: Partial<SlideEffect>) {
    const { sections, selectedSlide } = get();
    if (!selectedSlide?.slide || !selectedSlide?.section) return;

    const newSections = sections.map((s) =>
      s.id === selectedSlide.section!.id
        ? {
          ...s,
          slides: s.slides.map((sl) =>
            sl.id === selectedSlide.slide!.id
              ? {
                ...sl,
                effects: (sl.effects || []).map((e) => {
                  // Check if this effect matches the ID
                  const effectInnerObj = e.effect.case === 'spotlight' ? e.effect.value :
                    e.effect.case === 'zoom' ? e.effect.value : null;
                  return effectInnerObj?.id === effectId ? { ...e, ...updates } : e;
                }),
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
          effects: (selectedSlide.slide.effects || []).map((e) => {
            const effectInnerObj = e.effect.case === 'spotlight' ? e.effect.value :
              e.effect.case === 'zoom' ? e.effect.value : null;
            return effectInnerObj?.id === effectId ? { ...e, ...updates } : e;
          }),
        },
      },
    });
  },

  updateAnnotation(annotationId: string, updates: Partial<AnnotationObject>) {
    const { sections, selectedSlide } = get();
    if (!selectedSlide?.slide || !selectedSlide?.section) return;

    const newSections = sections.map((s) =>
      s.id === selectedSlide.section!.id
        ? {
          ...s,
          slides: s.slides.map((sl) =>
            sl.id === selectedSlide.slide!.id
              ? {
                ...sl,
                annotations: (sl.annotations || []).map((a) => {
                  // Check if this annotation matches the ID
                  const annotationInnerObj = a.annotation.case === 'callout' ? a.annotation.value : null;
                  return annotationInnerObj?.id === annotationId ? { ...a, ...updates } : a;
                }),
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
          annotations: (selectedSlide.slide.annotations || []).map((a) => {
            const annotationInnerObj = a.annotation.case === 'callout' ? a.annotation.value : null;
            return annotationInnerObj?.id === annotationId ? { ...a, ...updates } : a;
          }),
        },
      },
    });
  },

  deleteEffect(effectId: string) {
    const { sections, selectedSlide } = get();
    if (!selectedSlide?.slide || !selectedSlide?.section) return;

    const newSections = sections.map((s) =>
      s.id === selectedSlide.section!.id
        ? {
          ...s,
          slides: s.slides.map((sl) =>
            sl.id === selectedSlide.slide!.id
              ? {
                ...sl,
                effects: (sl.effects || []).filter((e) => {
                  const effectInnerObj = e.effect.case === 'spotlight' ? e.effect.value :
                    e.effect.case === 'zoom' ? e.effect.value : null;
                  return effectInnerObj?.id !== effectId;
                })
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
          effects: (selectedSlide.slide.effects || []).filter((e) => {
            const effectInnerObj = e.effect.case === 'spotlight' ? e.effect.value :
              e.effect.case === 'zoom' ? e.effect.value : null;
            return effectInnerObj?.id !== effectId;
          }),
        },
      },
      selectedObjectId: null,
    });

    get().notifyConfigChange(newSections);
  },

  deleteAnnotation(annotationId: string) {
    const { sections, selectedSlide } = get();
    if (!selectedSlide?.slide || !selectedSlide?.section) return;

    const newSections = sections.map((s) =>
      s.id === selectedSlide.section!.id
        ? {
          ...s,
          slides: s.slides.map((sl) =>
            sl.id === selectedSlide.slide!.id
              ? {
                ...sl,
                annotations: (sl.annotations || []).filter((a) => {
                  const annotationInnerObj = a.annotation.case === 'callout' ? a.annotation.value : null;
                  return annotationInnerObj?.id !== annotationId;
                }),
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
          annotations: (selectedSlide.slide.annotations || []).filter((a) => {
            const annotationInnerObj = a.annotation.case === 'callout' ? a.annotation.value : null;
            return annotationInnerObj?.id !== annotationId;
          }),
        },
      },
      selectedObjectId: null,
    });

    get().notifyConfigChange(newSections);
  },

  // Backward compatibility
  updateCanvasObject(objectId: string, updates: Record<string, unknown>) {
    const { selectedSlide } = get();
    if (!selectedSlide?.slide) return;

    // Check if it's an effect
    const effect = selectedSlide.slide.effects?.find((e) => {
      const effectInnerObj = e.effect.case === 'spotlight' ? e.effect.value :
        e.effect.case === 'zoom' ? e.effect.value : null;
      return effectInnerObj?.id === objectId;
    });
    if (effect) return get().updateEffect(objectId, updates as Partial<SlideEffect>);

    // Check if it's an annotation
    const annotation = selectedSlide.slide.annotations?.find((a) => {
      const annotationInnerObj = a.annotation.case === 'callout' ? a.annotation.value : null;
      return annotationInnerObj?.id === objectId;
    });
    if (annotation) return get().updateAnnotation(objectId, updates as Partial<AnnotationObject>);

    console.warn(`updateCanvasObject: ${objectId} not found`);
  },

  deleteCanvasObject(objectId: string) {
    const { selectedSlide } = get();
    if (!selectedSlide?.slide) return;

    // Check if it's an effect
    const effect = selectedSlide.slide.effects?.find((e) => {
      const effectInnerObj = e.effect.case === 'spotlight' ? e.effect.value :
        e.effect.case === 'zoom' ? e.effect.value : null;
      return effectInnerObj?.id === objectId;
    });
    if (effect) return get().deleteEffect(objectId);

    // Check if it's an annotation
    const annotation = selectedSlide.slide.annotations?.find((a) => {
      const annotationInnerObj = a.annotation.case === 'callout' ? a.annotation.value : null;
      return annotationInnerObj?.id === objectId;
    });
    if (annotation) return get().deleteAnnotation(objectId);

    console.warn(`deleteCanvasObject: ${objectId} not found`);
  },
});
