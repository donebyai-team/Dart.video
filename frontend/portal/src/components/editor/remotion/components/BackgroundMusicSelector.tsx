import { Music, VolumeX, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVideoStore } from "@/stores/video";

const backgroundTracks = [
    {
        id: "none",
        name: "No Music",
        icon: VolumeX,
    },
    {
        id: "deep-calm",
        name: "Deep Calm",
        url: "https://ik.imagekit.io/coasterai/freepik-deep-calm_A4WXzk4Mk.mp3",
        icon: Waves,
    },
];



const BackgroundMusicSelector = () => {
    const videoConfig = useVideoStore(s => s.videoConfig);
    const setBackgroundMusic = useVideoStore(s => s.setBackgroundMusic);

    const currentUrl = videoConfig?.metadata?.backgroundAudioUrl;

    const selectedTrack =
        backgroundTracks.find(track => track.url === currentUrl) ||
        backgroundTracks[0];

    const SelectedIcon = selectedTrack.icon;    


    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
                    <SelectedIcon className="w-3.5 h-3.5" />
                    {selectedTrack.name}
                </Button>

            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
                {backgroundTracks.map(track => {
                    const TrackIcon = track.icon;

                    return (
                        <DropdownMenuItem
                            key={track.id}
                            onClick={() => setBackgroundMusic(track.url)}
                            className="gap-2"
                        >
                            <TrackIcon className="w-4 h-4" />
                            <span className="flex-1">{track.name}</span>
                        </DropdownMenuItem>
                    );
                })}

            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default BackgroundMusicSelector;
