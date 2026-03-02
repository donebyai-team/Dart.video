import { Check } from "lucide-react";
import { TransitionDirection } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { TRANSITION_DIRECTION_OPTIONS } from "@coasterai/renderer";

interface TransitionDirectionPickerProps {
    currentDirection?: TransitionDirection;
    onSelect: (direction: TransitionDirection) => void;
}

const TransitionDirectionPicker = ({
    currentDirection,
    onSelect,
}: TransitionDirectionPickerProps) => {
    return (
        <div className="space-y-0.5">
            <div className="px-2 pt-1 pb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                Direction
            </div>
            {TRANSITION_DIRECTION_OPTIONS.map((directionOption) => (
                <button
                    key={directionOption.id}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect(directionOption.id);
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                        currentDirection === directionOption.id
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted text-foreground"
                    }`}
                >
                    <span className="flex-1 text-left">{directionOption.label}</span>
                    {currentDirection === directionOption.id && <Check className="w-3 h-3" />}
                </button>
            ))}
        </div>
    );
};

export default TransitionDirectionPicker;
