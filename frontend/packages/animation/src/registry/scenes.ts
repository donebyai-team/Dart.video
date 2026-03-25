import z from "zod";
import { ComponentRegistration } from "./registry";
import { fixedFrameTimingSchema } from "./animation_primitives";
import { TYPOGRAPHY_VARIANT_NAMES } from "../tokens/semantic";
import { ENTRANCE_ANIMATIONS, LOGO_ANIMATIONS, PEEL_DIRECTIONS } from "../components/scenes/types";
import { AnimatedNumberDescriptor } from "../components/scenes/text/AnimatedNumber";
import { TextStaggerDescriptor } from "../components/scenes/text/TextStagger";
import { TypewriterDescriptor } from "../components/scenes/text/Typewriter";
import { TextHighlightDescriptor } from "../components/scenes/text/TextHighlight";
import { TextCycleDescriptor } from "../components/scenes/text/TextCycle";
import { AnimatedImageDescriptor } from "../components/scenes/assets/AnimatedImage";
import { AnimatedVideoDescriptor } from "../components/scenes/assets/AnimatedVideo";
import { ImagePeelDescriptor } from "../components/scenes/assets/ImagePeel";
import { LogoAssetDescriptor } from "../components/scenes/assets/LogoAsset";
import { LogoWithBrandNameDescriptor } from "../components/scenes/assets/LogoWithBrandName";


export const SCENE_COMPONENTS: ComponentRegistration[] = [
  // Text components with schemas and duration calculators
  AnimatedNumberDescriptor,
  TextStaggerDescriptor,
  TypewriterDescriptor,
  TextHighlightDescriptor,
  TextCycleDescriptor,
  
  // Asset components with schemas and duration calculators
  AnimatedImageDescriptor,
  AnimatedVideoDescriptor,
  ImagePeelDescriptor,
  LogoAssetDescriptor,
  LogoWithBrandNameDescriptor,
];