import { VolumeX, Waves, Sunrise, BeakerIcon, VolumeIcon, TrendingUp, Rocket, BookHeartIcon, HeartIcon } from "lucide-react";
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
        id: "dramatic-beat",
        name: "Dramatic Beats",
        url: "https://storage.googleapis.com/coasterai-public/background_music/DramaticBeats.mp3",
        icon: HeartIcon,
    },
    {
        id: "fast-beat",
        name: "Fast Beat",
        url: "https://storage.googleapis.com/coasterai-public/background_music/FastBeat.mp3",
        icon: BookHeartIcon,
    },
    {
        id: "dance-groove",
        name: "Dance Groove",
        url: "https://storage.googleapis.com/coasterai-public/background_music/DanceGroove.mp3",
        icon: Waves,
    },
    {
        id: "deep-calm",
        name: "Deep Calm",
        url: "https://ik.imagekit.io/coasterai/freepik-deep-calm_A4WXzk4Mk.mp3",
        icon: VolumeIcon,
    },
    {
        id: "steady-rise",
        name: "Steady Rise",
        url: "https://storage.googleapis.com/coasterai-public/background_music/The_Steady_Rise.mp3",
        icon: TrendingUp,
    },
    {
        id: "upward-trajectory",
        name: "Upward Trajectory",
        url: "https://storage.googleapis.com/coasterai-public/background_music/Upward_Trajectory.mp3",
        icon: Rocket,
    },
    {
        id: "next-wave",
        name: "Next Wave",
        url: "https://storage.googleapis.com/coasterai-public/background_music/above-the-next-wave.mp3",
        icon: Waves,
    },
    {
        id: "boardroom-groove",
        name: "Boardroom Groove",
        url: "https://storage.googleapis.com/coasterai-public/background_music/boardroom-groove-revolution.mp3",
        icon: BeakerIcon,
    },
    {
        id: "chasing-the-morning",
        name: "Chasing the Morning",
        url: "https://storage.googleapis.com/coasterai-public/background_music/chasing-the-morning-light.mp3",
        icon: Sunrise,
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
