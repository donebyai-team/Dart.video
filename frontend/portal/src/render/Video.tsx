import Slideshow from '../components/editor/RemotionSlideshow'
import { Composition } from 'remotion'
import video from './video.json'

export const MyVideo = () => {
  //Get video FPS and total frames of video
  const fps = video.metadata.fps
  const totalVideoFrames = video.metadata.duration * fps

  // Get video resolution i.e width and height
  const width = video.metadata.resolution.width
  const height = video.metadata.resolution.height

  return (
    <>
      <Composition
        id='MyComposition'
        component={Slideshow as any}
        durationInFrames={totalVideoFrames}
        fps={fps}
        width={width}
        height={height}
        defaultProps={{
          fps,
          isEditing: false, // Only enable editing when NOT playing
          onSelectTemplate: undefined,
          video
        }}
      />
    </>
  )
}
