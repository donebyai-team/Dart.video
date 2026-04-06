import { useVideoStore } from "@/stores/video";

interface BrandColorsProps {
  onSelect: (color: string) => void;
  selectedColor?: string | null;
  title?: string;
  className?: string;
  swatchClassName?: string;
}

export default function BrandColors({
  onSelect,
  selectedColor,
  title = "Brand Colors",
  className = "grid grid-cols-10 gap-1",
  swatchClassName = "w-6 h-6 rounded-md transition-all duration-200 hover:scale-110",
}: BrandColorsProps) {
  const brandColors = useVideoStore(
    (s) => s.videoConfig?.metadata?.generatedBranding?.brandIdentity?.colors
  );

  if (!brandColors?.length) {
    return null;
  }

  const normalizedSelectedColor = selectedColor?.toLowerCase();

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </p>

      <div className={className}>
        {brandColors.map((color) => {
          const hex = color.colorHexCode;
          const isActive = normalizedSelectedColor === hex.toLowerCase();

          return (
            <button
              key={hex}
              type="button"
              onClick={() => onSelect(hex)}
              className={`${swatchClassName} ${
                isActive
                  ? "ring-2 ring-primary ring-offset-1 ring-offset-card"
                  : ""
              }`}
              style={{ backgroundColor: hex }}
              title={hex}
            />
          );
        })}
      </div>
    </div>
  );
}
