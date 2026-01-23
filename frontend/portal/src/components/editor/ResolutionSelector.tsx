import { Monitor, Smartphone, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resolutions, type Resolution } from "@/types/slides";
import { useVideoStore } from "@/stores/video";

const resolutionIcons: Record<string, React.ElementType> = {
  "16:9": Monitor,
  "4:3": Monitor,
  "9:16": Smartphone,
  "1:1": Square,
};

const ResolutionSelector = () => {
  const resolution = useVideoStore(s => s.resolution);
  const setResolution = useVideoStore(s => s.setResolution);
  const Icon = resolutionIcons[resolution.id] || Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
          <Icon className="w-3.5 h-3.5" />
          {resolution.id}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {resolutions.map((res) => {
          const ResIcon = resolutionIcons[res.id] || Monitor;
          return (
            <DropdownMenuItem
              key={res.id}
              onClick={() => setResolution(res)}
              className="gap-2"
            >
              <ResIcon className="w-4 h-4" />
              <span className="flex-1">{res.name}</span>
              <span className="text-muted-foreground text-xs">{res.id}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ResolutionSelector;
