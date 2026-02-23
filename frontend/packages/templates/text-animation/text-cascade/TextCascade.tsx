import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { EditableText } from '../../lib/EditableText'
import { TextCascadeTemplateConfigSchema, TextCascadeTemplateProps } from './types'
import { FallbackTemplate } from '../../lib/FallbackTemplate'

interface Props {
  props: TextCascadeTemplateProps
  onChange: (newProps: TextCascadeTemplateProps) => void
}

const RemoteComponent = ({ props, onChange }: Props) => {
  // validate the props
  const result = TextCascadeTemplateConfigSchema.safeParse(props)
  if (!result.success) {
    console.error("Template validation failed:", result.error)

    return (
      <FallbackTemplate message="Input props schema is incorrect for this template." />
    )
  }

  const safeProps = result.data


  const centerText = safeProps.centerText
  const topLeftText = safeProps.topLeftText
  console.debug("template input config:", safeProps)

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
    </>
  )
}

export { RemoteComponent }
