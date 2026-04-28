import { ComponentRegistration } from "./registry";
import { AnimatedNumberDescriptor } from "../components/scenes/text/AnimatedNumber";
import { StatCounterDescriptor } from "../components/scenes/text/StatCounter";
import { TextStaggerDescriptor } from "../components/scenes/text/TextStagger";
import { TitleSplitDescriptor } from "../components/scenes/text/TitleSplit";
import { TextHookStaggerDescriptor } from "../components/scenes/text/TextHookStagger";
import { TypewriterDescriptor } from "../components/scenes/text/Typewriter";
import { TextHighlightDescriptor } from "../components/scenes/text/TextHighlight";
import { TextWithWordCycleDescriptor } from "../components/scenes/text/TextWithWordCycle";
import { TextLeadStaggerDescriptor } from "../components/scenes/text/TextLeadStagger";
import { ProblemHeadlineDescriptor } from "../components/scenes/text/ProblemHeadline";
import { TextCardStackDescriptor } from "../components/scenes/text/TextCardStack";
import { AnimatedImageDescriptor } from "../components/scenes/assets/AnimatedImage";
import { AnimatedVideoDescriptor } from "../components/scenes/assets/AnimatedVideo";
import { MultiImageStackDescriptor } from "../components/scenes/assets/image_stack/MultiImageStack";
import { ProblemCollageDescriptor } from "../components/scenes/assets/ProblemCollage";
import { LogoAssetDescriptor } from "../components/scenes/assets/LogoAsset";
import { LogoShowcaseDescriptor } from "../components/scenes/assets/LogoShowcase";
import { LogoWithBrandNameDescriptor } from "../components/scenes/assets/LogoWithBrandName";
import { LogoWithCTADescriptor } from "../components/scenes/assets/LogoWithCTA";
import { IconShowcaseDescriptor } from "../components/scenes/assets/IconShowcase";
import { PillCarouselDescriptor } from "../components/scenes/assets/PillCarousel";
import { TextWithImageSceneDescriptor, TextWithVideoSceneDescriptor, WordCycleDescriptor } from "../components/scenes";


export const SCENE_COMPONENTS: ComponentRegistration[] = [
  // Text components with schemas and duration calculators
  AnimatedNumberDescriptor,
  StatCounterDescriptor,
  TextStaggerDescriptor,
  TitleSplitDescriptor,
  TextHookStaggerDescriptor,
  TypewriterDescriptor,
  TextHighlightDescriptor,
  WordCycleDescriptor,
  TextWithWordCycleDescriptor,
  TextLeadStaggerDescriptor,
  ProblemHeadlineDescriptor,
  TextCardStackDescriptor,
  
  // Asset components with schemas and duration calculators
  // AnimatedImageDescriptor,
  // AnimatedVideoDescriptor,
  TextWithImageSceneDescriptor,
  TextWithVideoSceneDescriptor,
  MultiImageStackDescriptor,
  ProblemCollageDescriptor,
  // LogoAssetDescriptor,
  LogoShowcaseDescriptor,
  LogoWithBrandNameDescriptor,
  LogoWithCTADescriptor,
  IconShowcaseDescriptor,
  PillCarouselDescriptor,
];
