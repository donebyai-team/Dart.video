import { Volume2, VolumeX, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { useVideoStore } from "@/stores/video";

const backgroundTracks = [
    {
        Id: "none",
        Name: "No Music",
    },
    {
        Id: "classy-beats",
        Name: "Classy Beats",
        Url: "https://storage.googleapis.com/coasterai-public/background_music/ClassyBeats.mov",
    },
    {
        Id: "cpr-pulse",
        Name: "Corporate Pulse",
        Url: "https://storage.googleapis.com/coasterai-public/background_music/corporate-pulse-128.mp3",
    },
    {
        Id: "loop-floor",
        Name: "Loop Floor",
        Url: "https://storage.googleapis.com/coasterai-public/background_music/loopfloor-128.mp3",
    },
    {
        Id: "on-and-on",
        Name: "On And On",
        Url: "https://storage.googleapis.com/coasterai-public/background_music/on-and-on.mp3",
    },
    {
        Id: "retro-office",
        Name: "Retro Office",
        Url: "https://storage.googleapis.com/coasterai-public/background_music/retro-office-groove.mp3",
    },
    {
        Id: "serious-groove",
        Name: "Serious Groove",
        Url: "https://storage.googleapis.com/coasterai-public/background_music/serious-groove-engine.mp3",
    },
    {
        Id: "skywards",
        Name: "Skyward Spark",
        Url: "https://storage.googleapis.com/coasterai-public/background_music/skyward-sparks.mp3",
    },
    {
        Id: "dramatic-beat",
        Name: "Dramatic Beats",
        Url: "https://storage.googleapis.com/coasterai-public/background_music/DramaticBeats.mp3",
    },
    {
        Id: "fast-beat",
        Name: "Fast Beat",
        Url: "https://storage.googleapis.com/coasterai-public/background_music/FastBeat.mp3",
    },
    {
        Id: "up-beat",
        Name: "UpBeat",
        Url: "https://storage.googleapis.com/coasterai-public/background_music/upbeat.mp3",
    },
    {
        Id: "future-pass",
        Name: "Future Pass",
        Url: "https://storage.googleapis.com/coasterai-public/background_music/future-pass.mp3",
    },
    {
        Id: "deep-electronic",
        Name: "Deep Electronic",
        Url: "https://storage.googleapis.com/coasterai-public/background_music/Deep%20Electronic.mp3",
    },
    {
        Id: "dance-groove",
        Name: "Dance Groove",
        Url: "https://storage.googleapis.com/coasterai-public/background_music/DanceGroove.mp3",
    },
    {
        Id: "deep-calm",
        Name: "Deep Calm",
        Url: "https://ik.imagekit.io/coasterai/freepik-deep-calm_A4WXzk4Mk.mp3",
    },
    {
        Id: "steady-rise",
        Name: "Steady Rise",
        Url: "https://storage.googleapis.com/coasterai-public/background_music/The_Steady_Rise.mp3",
    },
    {
        Id: "upward-trajectory",
        Name: "Upward Trajectory",
        Url: "https://storage.googleapis.com/coasterai-public/background_music/Upward_Trajectory.mp3",
    },
    {
        Id: "next-wave",
        Name: "Next Wave",
        Url: "https://storage.googleapis.com/coasterai-public/background_music/above-the-next-wave.mp3",
    },
    {
        Id: "boardroom-groove",
        Name: "Boardroom Groove",
        Url: "https://storage.googleapis.com/coasterai-public/background_music/boardroom-groove-revolution.mp3",
    },
    {
        Id: "chasing-the-morning",
        Name: "Chasing the Morning",
        Url: "https://storage.googleapis.com/coasterai-public/background_music/chasing-the-morning-light.mp3",
    },
];

const BackgroundMusicSelector = () => {
    const videoConfig = useVideoStore(s => s.videoConfig);
    const setBackgroundMusic = useVideoStore(s => s.setBackgroundMusic);
    const setBackgroundMusicVolume = useVideoStore(s => s.setBackgroundMusicVolume);

    const currentUrl = videoConfig?.metadata?.bgAudio?.url ?? videoConfig?.metadata?.backgroundAudioUrl;
    const hasBackgroundAudio = Boolean(currentUrl);
    const volume = [Math.round((videoConfig?.metadata?.bgAudio?.volume ?? 0.8) * 100)];
    const isMuted = volume[0] === 0;

    const selectedTrack =
        backgroundTracks.find(track => track.Url === currentUrl) ||
        backgroundTracks[0];


    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
                    {selectedTrack.Name === "No Music" ? (
                        <VolumeX className="w-4 h-4 text-muted-foreground" />
                    ) : (
                        <Music className="w-4 h-4" />
                    )}

                    {selectedTrack.Name}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 p-0">
                <div
                    className="flex items-center gap-3 p-4 border-b"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => setBackgroundMusicVolume(isMuted ? 0.8 : 0)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {isMuted ? (
                            <VolumeX className="w-4 h-4" />
                        ) : (
                            <Volume2 className="w-4 h-4" />
                        )}
                    </button>

                    <Slider
                        value={volume}
                        onValueChange={(v) => {
                            if (hasBackgroundAudio) {
                                setBackgroundMusicVolume(v[0] / 100);
                            }
                        }}
                        max={100}
                        step={1}
                        className="flex-1"
                    />
                </div>

                <div className="max-h-64 overflow-y-auto py-1">
                    {backgroundTracks.map((track) => (
                        <DropdownMenuItem
                            key={track.Id}
                            onClick={() => setBackgroundMusic(track.Url)}
                            className="gap-2"
                        >
                            {track.Name === "No Music" ? (
                                <VolumeX className="w-4 h-4 text-muted-foreground" />
                            ) : (
                                <span className="w-4 text-center text-muted-foreground">•</span>
                            )}
                            <span className="flex-1">{track.Name}</span>
                        </DropdownMenuItem>
                    ))}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default BackgroundMusicSelector;
