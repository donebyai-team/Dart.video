import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

const TEXT_CONTENT     = 'Build products people love'
const TEXT_COLOR       = '#ffffff'
const TEXT_FONT_SIZE   = 64
const TEXT_FONT_FAMILY = 'Inter, sans-serif'
const TEXT_FONT_WEIGHT = 700
const TEXT_SHADOW      = '0 2px 20px rgba(147, 51, 234, 0.4)'
const LETTER_DELAY     = 1.5

export const RemoteComponent = () => {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()

  const letters = TEXT_CONTENT.split('')

  return (
    <div
      style={{
        width:    '100%',
        height:   '100%',
        position: 'relative',
        background: 'transparent',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display:        'flex',
          flexWrap:       'wrap',
          justifyContent: 'center',
          alignItems:     'center',
          maxWidth:       Math.round(width * 0.75),
        }}
      >
        {letters.map((letter, i) => {
          const animProgress = spring({
            frame: frame - i * LETTER_DELAY,
            fps,
            config: { damping: 20, stiffness: 150 },
          })

          const opacity    = interpolate(animProgress, [0, 1], [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          const translateY = interpolate(animProgress, [0, 1], [20, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

          return (
            <span
              key={i}
              style={{
                fontSize:   TEXT_FONT_SIZE,
                color:      TEXT_COLOR,
                fontFamily: TEXT_FONT_FAMILY,
                fontWeight: TEXT_FONT_WEIGHT,
                textShadow: TEXT_SHADOW,
                opacity,
                transform:  `translateY(${translateY}px)`,
                display:    'inline-block',
                whiteSpace: 'pre',
              }}
            >
              {letter}
            </span>
          )
        })}
      </div>
    </div>
  )
}