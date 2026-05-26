import { ComponentRegistration } from "./registry";
import { StatCounterDescriptor } from "../components/scenes/text/StatCounter";
import { AnimatedTextDescriptor } from "../components/scenes/text/AnimatedText";
import { TextHookStaggerDescriptor } from "../components/scenes/text/TextHookStagger";
import { TypewriterDescriptor } from "../components/scenes/text/Typewriter";
import { TextWithWordCycleDescriptor } from "../components/scenes/text/TextWithWordCycle";
import { TextLeadStaggerDescriptor } from "../components/scenes/text/TextLeadStagger";
import { ProblemHeadlineDescriptor } from "../components/scenes/text/ProblemHeadline";
import { TextCardStackDescriptor } from "../components/scenes/text/TextCardStack";
import { IntroTextDescriptor } from "../components/scenes/text/IntroText";
import { MultiImageStackDescriptor } from "../components/scenes/assets/image_stack/MultiImageStack";
import { ProblemCollageDescriptor } from "../components/scenes/assets/ProblemCollage";
import { LogoShowcaseDescriptor } from "../components/scenes/assets/LogoShowcase";
import { LogoWithBrandNameDescriptor } from "../components/scenes/assets/LogoWithBrandName";
import { LogoWithCTADescriptor } from "../components/scenes/assets/LogoWithCTA";
import { IconShowcaseDescriptor } from "../components/scenes/assets/IconShowcase";
import { PillCarouselDescriptor } from "../components/scenes/assets/PillCarousel";
import { MediaWithFeaturesDescriptor } from "../components/scenes/assets/MediaWithFeatures";
import { AnimatedMediaDescriptor } from "../components/scenes/assets/AnimatedMedia";
import { TimelineCardStackDescriptor } from "../components/scenes/assets/TimelineCardStack";
import { TextWithMediaSceneDescriptor, WordCycleDescriptor } from "../components/scenes";


export const SCENE_COMPONENTS: ComponentRegistration[] = [
  // Text components with schemas and duration calculators

  /* @deprecated
  */
  // TextStaggerDescriptor,
  // TextHighlightDescriptor,

  StatCounterDescriptor,
  AnimatedTextDescriptor,
  TextHookStaggerDescriptor,
  TypewriterDescriptor,
  WordCycleDescriptor,
  TextWithWordCycleDescriptor,
  TextLeadStaggerDescriptor,
  ProblemHeadlineDescriptor,
  TextCardStackDescriptor,
  IntroTextDescriptor,

  // Asset components with schemas and duration calculators
  // AnimatedImageDescriptor,
  // AnimatedVideoDescriptor,
  TextWithMediaSceneDescriptor,
  MultiImageStackDescriptor,
  ProblemCollageDescriptor,
  // LogoAssetDescriptor,
  LogoShowcaseDescriptor,
  LogoWithBrandNameDescriptor,
  LogoWithCTADescriptor,
  IconShowcaseDescriptor,
  PillCarouselDescriptor,
  MediaWithFeaturesDescriptor,
  AnimatedMediaDescriptor,
  TimelineCardStackDescriptor,
];
