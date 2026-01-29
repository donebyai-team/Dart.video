import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { EditableText } from '../../lib/EditableText'
import { TextCascadeTemplateConfigSchema, TextCascadeTemplateProps } from './types'

interface Props {
  props: TextCascadeTemplateProps
  onChange: (newProps: TextCascadeTemplateProps) => void
}

const RemoteComponent = ({ props, onChange }: Props) => {
  //schema check
  TextCascadeTemplateConfigSchema.parse(props)

  const centerText = props.centerText
  const topLeftText = props.topLeftText
  console.log(centerText, topLeftText)

  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  return (
    <>
      {/* center text */}
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
        <EditableText
          onChange={newProps => {
            onChange({
              ...props,
              centerText: {
                ...props.centerText,
                ...newProps
              }
            })
          }}
          props={centerText}
        >
          {centerText.text.split('').map((letter: string, i: number) => {
            const delay = i * 1.5
            console.log(frame, i, 'frame')
            const animProgress = spring({
              frame: frame - delay,
              fps,
              config: { damping: 20, stiffness: 150 }
            })

            const opacity = interpolate(animProgress, [0, 1], [0, 1])
            const translateX = interpolate(animProgress, [0, 1], [-20, 0])

            return (
              <span
                key={i}
                style={{
                  ...centerText.style,
                  opacity,
                  transform: `translateX(${translateX}px)`,
                  textShadow: '0 2px 20px rgba(147, 51, 234, 0.4)'
                }}
              >
                {letter === ' ' ? '\u00A0' : letter}
              </span>
            )
          })}
        </EditableText>
      </div>

      {/* top left text */}
      <div style={{ position: 'absolute', left: '10%', top: '10%' }}>
        <EditableText
          onChange={newProps => {
            onChange({
              ...props,
              topLeftText: {
                ...props.topLeftText,
                ...newProps
              }
            })
          }}
          props={topLeftText}
        >
          {topLeftText.text.split('').map((letter: string, i: number) => {
            const delay = i * 1.5
            console.log(frame, i, 'frame')
            const animProgress = spring({
              frame: frame - delay,
              fps,
              config: { damping: 20, stiffness: 150 }
            })

            const opacity = interpolate(animProgress, [0, 1], [0, 1])
            const translateX = interpolate(animProgress, [0, 1], [-20, 0])

            return (
              <span
                key={i}
                style={{
                  ...topLeftText.style,
                  opacity,
                  transform: `translateX(${translateX}px)`,
                  textShadow: '0 2px 20px rgba(147, 51, 234, 0.4)'
                }}
              >
                {letter === ' ' ? '\u00A0' : letter}
              </span>
            )
          })}
        </EditableText>
      </div>
    </>
  )
}

export { RemoteComponent }
