// templateRegistry.ts
export const templateRegistry = {
  textCascade: () => import("./build/TextCascade.mjs"),
  imageFade:() => import("./build/ImageFade.mjs")

}
