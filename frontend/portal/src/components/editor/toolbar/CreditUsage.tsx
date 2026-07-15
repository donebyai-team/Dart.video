import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { useClientsContext } from "@coasterai/ui-core/context/ClientContext";
import { useVideoStore } from "@/stores/video";

interface CreditUsageProps {
    videoId: string;
}

const CreditUsage = ({ videoId }: CreditUsageProps) => {
    const { portalClient } = useClientsContext();
    const videoConfig = useVideoStore(s => s.videoConfig);
    const [credits, setCredits] = useState<number | null>(null);

    useEffect(() => {
        let isActive = true;

        const fetchCredits = async () => {
            if (!videoId) return;

            try {
                const response = await portalClient.getCredits({
                    referenceID: videoId,
                });

                if (isActive) {
                    setCredits(response.available);
                }
            } catch (err) {
                console.error("Failed to fetch credit usage", err);
            }
        };

        fetchCredits();

        return () => {
            isActive = false;
        };
    }, [portalClient, videoId, videoConfig?.version]);

    return (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-1.5 text-xs">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
                {credits != null ? Math.abs(credits) : "--"} credits
            </span>
        </div>
    );
};

export default CreditUsage;
