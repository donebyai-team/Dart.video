import { Composition, continueRender, delayRender, getInputProps, getRemotionEnvironment } from 'remotion'
import { useEffect, useState } from 'react'
import video from './video.json'
import Slideshow from './RemotionSlideshow'
import { loadAllFonts } from './fonts'

export const MyVideo = () => {
  const { isRendering } = getRemotionEnvironment()
  const inputProps = getInputProps() as { video?: typeof video } | undefined
  const videoData = inputProps?.video ?? video
  const [renderHandle] = useState(() =>
    isRendering ? delayRender('Loading renderer fonts') : null,
  )

  //Get video FPS and total frames of video
  const fps = videoData.metadata.fps
  const totalVideoFrames = videoData.metadata.durationInFrames

  // Get video resolution i.e width and height
  const width = videoData.metadata.resolution.width
  const height = videoData.metadata.resolution.height

  useEffect(() => {
    if (!isRendering) {
      return;
    }

    let disposed = false;

    loadAllFonts(true)
      .finally(() => {
        if (!disposed && renderHandle !== null) {
          continueRender(renderHandle)
        }
      })

    return () => {
      disposed = true
    }
  }, [isRendering, renderHandle])

  return (
    <>
      <Composition
        id='MyComposition'
        component={Slideshow as any}
        durationInFrames={Math.ceil(totalVideoFrames)}
        fps={fps}
        width={width}
        height={height}
        defaultProps={{
          fps,
          isEditing: false, // Only enable editing when NOT playing
          onSelectTemplate: undefined,
          video: videoData
        }}
      /> 
    </>
  )
}
