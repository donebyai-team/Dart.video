import { ComponentRegistration } from "./registry";
import { AnimatedNumberDescriptor } from "../components/scenes/text/AnimatedNumber";
import { TextStaggerDescriptor } from "../components/scenes/text/TextStagger";
import { TypewriterDescriptor } from "../components/scenes/text/Typewriter";
import { TextHighlightDescriptor } from "../components/scenes/text/TextHighlight";
import { TextCycleDescriptor } from "../components/scenes/text/TextCycle";
import { TextWithWordCycleDescriptor } from "../components/scenes/text/TextWithWordCycle";
import { TextLeadStaggerDescriptor } from "../components/scenes/text/TextLeadStagger";
import { ProblemHeadlineDescriptor } from "../components/scenes/text/ProblemHeadline";
import { AnimatedImageDescriptor } from "../components/scenes/assets/AnimatedImage";
import { AnimatedVideoDescriptor } from "../components/scenes/assets/AnimatedVideo";
import { ImagePeelDescriptor } from "../components/scenes/assets/ImagePeel";
import { ProblemCollageDescriptor } from "../components/scenes/assets/ProblemCollage";
import { LogoAssetDescriptor } from "../components/scenes/assets/LogoAsset";
import { LogoShowcaseDescriptor } from "../components/scenes/assets/LogoShowcase";
import { LogoWithBrandNameDescriptor } from "../components/scenes/assets/LogoWithBrandName";
import { IconShowcaseDescriptor } from "../components/scenes/assets/IconShowcase";
import { TextWithImageSceneDescriptor, TextWithVideoSceneDescriptor } from "../components/scenes";


export const SCENE_COMPONENTS: ComponentRegistration[] = [
  // Text components with schemas and duration calculators
  AnimatedNumberDescriptor,
  TextStaggerDescriptor,
  TypewriterDescriptor,
  TextHighlightDescriptor,
  TextCycleDescriptor,
  TextWithWordCycleDescriptor,
  TextLeadStaggerDescriptor,
  ProblemHeadlineDescriptor,
  
  // Asset components with schemas and duration calculators
  // AnimatedImageDescriptor,
  // AnimatedVideoDescriptor,
  TextWithImageSceneDescriptor,
  TextWithVideoSceneDescriptor,
  ImagePeelDescriptor,
  ProblemCollageDescriptor,
  LogoAssetDescriptor,
  LogoShowcaseDescriptor,
  LogoWithBrandNameDescriptor,
  IconShowcaseDescriptor,
];
