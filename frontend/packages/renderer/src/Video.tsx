import { Composition, getInputProps, getRemotionEnvironment } from 'remotion'
import video from './video.json'
import Slideshow from './RemotionSlideshow'
import { loadAllFonts } from './fonts'

export const MyVideo = () => {
  const inputProps = getInputProps() as { video?: typeof video } | undefined
  const videoData = inputProps?.video ?? video

  //Get video FPS and total frames of video
  const fps = videoData.metadata.fps
  const totalVideoFrames = videoData.metadata.durationInFrames

  // Get video resolution i.e width and height
  const width = videoData.metadata.resolution.width
  const height = videoData.metadata.resolution.height

  if (getRemotionEnvironment().isRendering) {
    loadAllFonts()
  }

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
