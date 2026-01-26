import { Slide, SlideType } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { useMemo } from "react";

interface SlideThumbnailProps {
  slide: Slide;
  animationStyle?: number;
}

// Mini version of slide preview for storyboard cards - matches RemotionSlideshow final state
const SlideThumbnail = ({ slide}: SlideThumbnailProps) => {
  const renderContent = useMemo(() => {
    switch (slide.type) {
      case SlideType.TEXT_ANIMATION:
        return <TextAnimationThumbnail slide={slide} />;
      case SlideType.VISUAL_ANIMATION:
        return <VisualAnimationThumbnail slide={slide} />;
      case SlideType.INFOGRAPHIC:
        return <InfographicThumbnail slide={slide} />;
      case SlideType.VIDEO:
        return <VideoThumbnail slide={slide} />;
      case SlideType.STACK:
        return <StackThumbnail slide={slide} />;
      case SlideType.IMAGE:
      default:
        return <ImageThumbnail slide={slide} />;
    }
  }, [slide]);

  return (
    <div className="w-full h-full overflow-hidden rounded">
      {renderContent}
    </div>
  );
};

// Text Animation Thumbnail - shows final animated state with text
const TextAnimationThumbnail = ({ slide }: { slide: Slide }) => {
  // Get text from content.template_config (new architecture)
  const content = slide.content as any;
  const displayText = content?.template_config?.text || slide.transcript;
  
  // Use slide's background color or fall back to default
  const background = slide.backgroundColor || "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)";

  return (
    <div
      className="w-full h-full flex items-center justify-center p-1 relative overflow-hidden"
      style={{ background }}
    >
      <span
        className="text-[5px] font-bold text-white text-center leading-tight line-clamp-2 z-10"
        style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
      >
        {displayText}
      </span>
    </div>
  );
};

// Visual Animation Thumbnail - shows final state of geometric animations
const VisualAnimationThumbnail = ({ slide }: { slide: Slide }) => {
  const hash = slide.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variant = hash % 5;
  
  // Use slide's background color or fall back to defaults
  const defaultGradients = [
    "linear-gradient(135deg, #581c87 0%, #7c3aed 50%, #4f46e5 100%)",
    "linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)",
    "linear-gradient(135deg, #134e4a 0%, #14b8a6 100%)",
    "linear-gradient(135deg, #7f1d1d 0%, #ef4444 50%, #f97316 100%)",
    "linear-gradient(135deg, #713f12 0%, #f59e0b 100%)",
  ];
  
  const background = slide.backgroundColor || defaultGradients[variant];

  return (
    <div 
      className="w-full h-full flex items-center justify-center relative overflow-hidden"
      style={{ background }}
    >
      {variant === 0 && <RotatingSquaresThumbnail />}
      {variant === 1 && <PulsingCirclesThumbnail />}
      {variant === 2 && <FloatingShapesThumbnail />}
      {variant === 3 && <GrowingBarsThumbnail />}
      {variant === 4 && <OrbitingDotsThumbnail />}
    </div>
  );
};

// Larger, more visible geometric shapes for thumbnails
const RotatingSquaresThumbnail = () => (
  <>
    <div className="absolute w-8 h-8 border-2 border-white/60 rounded" style={{ transform: "rotate(45deg)" }} />
    <div className="absolute w-5 h-5 border-2 border-white/50 rounded" style={{ transform: "rotate(75deg)" }} />
    <div className="absolute w-3 h-3 bg-white/40 rounded" />
  </>
);

const PulsingCirclesThumbnail = () => (
  <>
    <div className="absolute w-12 h-12 rounded-full border-2 border-white/30" />
    <div className="absolute w-8 h-8 rounded-full border-2 border-white/40" />
    <div className="w-4 h-4 rounded-full bg-white/90" />
  </>
);

const FloatingShapesThumbnail = () => (
  <>
    <div className="absolute w-3 h-3 rounded-full bg-white/50" style={{ left: "20%", top: "25%" }} />
    <div className="absolute w-4 h-4 rounded bg-white/40" style={{ left: "70%", top: "35%" }} />
    <div className="absolute w-3.5 h-3.5 rounded-full bg-white/45" style={{ left: "35%", top: "65%" }} />
    <div className="w-6 h-6 rounded-full border-2 border-white/50" />
  </>
);

const GrowingBarsThumbnail = () => (
  <div className="flex gap-[3px] items-end h-[80%]">
    <div className="w-2.5 h-[55%] bg-white/90 rounded-t-sm" />
    <div className="w-2.5 h-[100%] bg-white/80 rounded-t-sm" />
    <div className="w-2.5 h-[40%] bg-white/85 rounded-t-sm" />
    <div className="w-2.5 h-[70%] bg-white/75 rounded-t-sm" />
  </div>
);

const OrbitingDotsThumbnail = () => (
  <>
    <div className="w-3 h-3 rounded-full border-2 border-white/70" />
    {[0, 1, 2, 3, 4, 5].map((i) => {
      const angle = (i * Math.PI * 2) / 6;
      const x = Math.cos(angle) * 14;
      const y = Math.sin(angle) * 14;
      return (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-white/80"
          style={{ left: `calc(50% + ${x}px - 4px)`, top: `calc(50% + ${y}px - 4px)` }}
        />
      );
    })}
  </>
);

// Infographic Thumbnail - shows chart visualization
const InfographicThumbnail = ({ slide }: { slide: Slide }) => {
  const hash = slide.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variant = hash % 3;

  // Use slide's background color or fall back to default
  const background = slide.backgroundColor || "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)";

  return (
    <div 
      className="w-full h-full flex items-center justify-center"
      style={{ background }}
    >
      {variant === 0 && <BarChartThumbnail />}
      {variant === 1 && <PieChartThumbnail />}
      {variant === 2 && <LineGraphThumbnail />}
    </div>
  );
};

const BarChartThumbnail = () => (
  <div className="flex gap-[3px] items-end h-[80%]">
    <div className="w-2.5 h-[45%] bg-blue-500 rounded-t-sm" />
    <div className="w-2.5 h-[75%] bg-emerald-500 rounded-t-sm" />
    <div className="w-2.5 h-[30%] bg-orange-500 rounded-t-sm" />
    <div className="w-2.5 h-[55%] bg-violet-500 rounded-t-sm" />
    <div className="w-2.5 h-[40%] bg-pink-500 rounded-t-sm" />
  </div>
);

const PieChartThumbnail = () => (
  <svg width="28" height="28" viewBox="0 0 28 28">
    <path d="M14 14 L14 2 A12 12 0 0 1 24 9 Z" fill="#3b82f6" />
    <path d="M14 14 L24 9 A12 12 0 0 1 21 22 Z" fill="#10b981" />
    <path d="M14 14 L21 22 A12 12 0 0 1 7 22 Z" fill="#f97316" />
    <path d="M14 14 L7 22 A12 12 0 0 1 14 2 Z" fill="#8b5cf6" />
    <circle cx="14" cy="14" r="5" fill="#0f172a" />
  </svg>
);

const LineGraphThumbnail = () => (
  <svg width="32" height="20" viewBox="0 0 32 20" className="overflow-visible">
    <polyline
      points="2,14 8,10 14,16 20,6 26,12 30,4"
      fill="none"
      stroke="#3b82f6"
      strokeWidth="2"
      strokeLinecap="round"
    />
    {[[2,14], [8,10], [14,16], [20,6], [26,12], [30,4]].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="2" fill="#3b82f6" />
    ))}
  </svg>
);

// Image Thumbnail
const ImageThumbnail = ({ slide }: { slide: Slide }) => {
  // Get image src from content directly (new architecture)
  const content = slide.content as any;
  const imageSrc = content?.src;
  
  if (!imageSrc) {
    return (
      <div className="w-full h-full bg-slate-900 flex items-center justify-center">
        <div className="w-4 h-4 border border-white/20 rounded" />
      </div>
    );
  }
  
  return (
    <div className="w-full h-full bg-slate-900">
      <img 
        src={imageSrc} 
        alt="" 
        className="w-full h-full object-cover"
      />
    </div>
  );
};

// Video Thumbnail
const VideoThumbnail = ({ slide }: { slide: Slide }) => {
  // Get video src from content directly (new architecture)
  const content = slide.content as any;
  const videoSrc = content?.src;
  
  if (!videoSrc) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-white/30 flex items-center justify-center">
          <div className="w-0 h-0 border-l-[4px] border-l-white border-y-[2px] border-y-transparent ml-0.5" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full bg-black relative">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-white/30 flex items-center justify-center">
          <div className="w-0 h-0 border-l-[4px] border-l-white border-y-[2px] border-y-transparent ml-0.5" />
        </div>
      </div>
    </div>
  );
};

// Stack Thumbnail - shows layered images
const StackThumbnail = ({ slide }: { slide: Slide }) => {
  // Get stack items from content directly (new architecture)
  const content = slide.content as any;
  const stackItems = content?.items || [];
  const itemCount = Math.min(stackItems.length, 4);
  
  // Use slide's background color or fall back to default
  const background = slide.backgroundColor || "linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)";
  
  return (
    <div 
      className="w-full h-full flex items-center justify-center relative overflow-hidden"
      style={{ background }}
    >
      {/* Stacked cards representation */}
      {[...Array(Math.max(itemCount, 2))].map((_, i) => (
        <div
          key={i}
          className="absolute w-8 h-5 bg-white/20 border border-white/40 rounded-sm"
          style={{
            transform: `translate(${i * 3}px, ${i * 3}px) rotate(${i * 2}deg)`,
            zIndex: 10 - i,
          }}
        />
      ))}
      <span className="absolute bottom-0.5 right-1 text-[6px] text-white/60 font-medium">
        {itemCount}x
      </span>
    </div>
  );
};

export default SlideThumbnail;
