import { Monitor, Smartphone, Square } from "lucide-react";
import { useVideoStore } from "@/stores/video";
import { Resolution } from "@coasterai/pb/coasterai/core/v1/video_pb";

const resolutionIcons: Record<string, React.ElementType> = {
  "16:9": Monitor,
  "4:3": Monitor,
  "9:16": Smartphone,
  "1:1": Square,
};

const resolutions: Resolution[] = [
  { $typeName: "coasterai.core.v1.Resolution", id: "16:9", name: "Landscape", aspect: "16/9", width: 1920, height: 1080 },
  { $typeName: "coasterai.core.v1.Resolution", id: "4:3", name: "Standard", aspect: "4/3", width: 1440, height: 1080 },
  { $typeName: "coasterai.core.v1.Resolution", id: "9:16", name: "Portrait", aspect: "9/16", width: 1080, height: 1920 },
  { $typeName: "coasterai.core.v1.Resolution", id: "1:1", name: "Square", aspect: "1/1", width: 1080, height: 1080 },
];

const ResolutionSelector = () => {
  const resolution = useVideoStore(s => s.videoConfig?.metadata?.resolution);
  const Icon = resolutionIcons[resolution?.id!] || Monitor;

  if (!resolution) return null;

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border bg-muted/40 text-xs">
      <Icon className="w-4 h-4 text-muted-foreground" />

      <div className="flex items-center gap-1.5">
        <span className="font-medium">
          {resolution.name}
        </span>
        <span className="text-muted-foreground">
        {resolution.width}×{resolution.height}
      </span>
{/* 
        <span className="text-muted-foreground">
          ({resolution.id})
        </span> */}
      </div>

      {/* <div className="h-3 w-px bg-border mx-1" />

      <span className="text-muted-foreground">
        {resolution.width} × {resolution.height}
      </span> */}
    </div>
  );
};


// const ResolutionSelector = () => {
//   const videoConfigFromStore = useVideoStore(s => s.videoConfig);
//   const setResolution = useVideoStore(s => s.setResolution);
//   const Icon = resolutionIcons[videoConfigFromStore?.metadata?.resolution?.id!] || Monitor;

//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
//           <Icon className="w-3.5 h-3.5" />
//           {videoConfigFromStore?.metadata?.resolution?.id}
//         </Button>
//       </DropdownMenuTrigger>
//       <DropdownMenuContent align="end">
//         {resolutions.map((res) => {
//           const ResIcon = resolutionIcons[res.id] || Monitor;
//           return (
//             <DropdownMenuItem
//               key={res.id}
//               onClick={() => setResolution(res)}
//               className="gap-2"
//             >
//               <ResIcon className="w-4 h-4" />
//               <span className="flex-1">{res.name}</span>
//               <span className="text-muted-foreground text-xs">{res.id}</span>
//             </DropdownMenuItem>
//           );
//         })}
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// };

export default ResolutionSelector;
