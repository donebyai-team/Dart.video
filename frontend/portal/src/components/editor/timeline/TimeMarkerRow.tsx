interface TimeMarkerRowProps {
  totalDuration: number;
  pixelsPerSecond: number;
}

export function TimeMarkerRow({ totalDuration, pixelsPerSecond }: TimeMarkerRowProps) {
  // Generate markers every 0.5 seconds
  const markerInterval = 0.5;
  const totalMarkers = Math.ceil(totalDuration / markerInterval) + 1;
  
  return (
    <div className="absolute inset-x-0 top-0 h-6 border-b border-border/50">
      {Array.from({ length: totalMarkers }, (_, i) => {
        const timeInSeconds = i * markerInterval;
        const isFullSecond = timeInSeconds % 1 === 0;
        
        return (
          <div
            key={i}
            className="absolute flex flex-col items-center"
            style={{ left: `${timeInSeconds * pixelsPerSecond}px` }}
          >
            {isFullSecond && (
              <span className="text-[10px] text-muted-foreground font-mono leading-none pt-1">
                {Math.floor(timeInSeconds)}s
              </span>
            )}
            <div 
              className="w-px bg-border"
              style={{ 
                height: '8px',
                marginTop: isFullSecond ? '4px' : '16px'
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
