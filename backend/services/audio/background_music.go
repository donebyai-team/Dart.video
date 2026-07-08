package audio

import (
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
)

var BackgroundTracks = []*pbcore.BackgroundTrack{
	{
		Id:   "fast-beat",
		Name: "Fast Beat",
		Url:  "https://storage.googleapis.com/coasterai-public/background_music/FastBeat.mp3",
	},
}

func GenerateBackgroundMusic() *pbcore.BackgroundTrack {
	return BackgroundTracks[0]
}
