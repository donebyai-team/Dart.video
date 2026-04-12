import { ComponentRegistration } from "./registry";
import { AnimatedNumberDescriptor } from "../components/scenes/text/AnimatedNumber";
import { TextStaggerDescriptor } from "../components/scenes/text/TextStagger";
import { TypewriterDescriptor } from "../components/scenes/text/Typewriter";
import { TextHighlightDescriptor } from "../components/scenes/text/TextHighlight";
import { TextCycleDescriptor } from "../components/scenes/text/TextCycle";
import { TextWithWordCycleDescriptor } from "../components/scenes/text/TextWithWordCycle";
import { AnimatedImageDescriptor } from "../components/scenes/assets/AnimatedImage";
import { AnimatedVideoDescriptor } from "../components/scenes/assets/AnimatedVideo";
import { ImagePeelDescriptor } from "../components/scenes/assets/ImagePeel";
import { LogoAssetDescriptor } from "../components/scenes/assets/LogoAsset";
import { LogoShowcaseDescriptor } from "../components/scenes/assets/LogoShowcase";
import { LogoWithBrandNameDescriptor } from "../components/scenes/assets/LogoWithBrandName";
import { IconShowcaseDescriptor } from "../components/scenes/assets/IconShowcase";


export const SCENE_COMPONENTS: ComponentRegistration[] = [
  // Text components with schemas and duration calculators
  AnimatedNumberDescriptor,
  TextStaggerDescriptor,
  TypewriterDescriptor,
  TextHighlightDescriptor,
  TextCycleDescriptor,
  TextWithWordCycleDescriptor,
  
  // Asset components with schemas and duration calculators
  AnimatedImageDescriptor,
  AnimatedVideoDescriptor,
  // ContentAwareSceneDescriptor,
  ImagePeelDescriptor,
  LogoAssetDescriptor,
  LogoShowcaseDescriptor,
  LogoWithBrandNameDescriptor,
  IconShowcaseDescriptor,
];
