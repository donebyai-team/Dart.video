package audio

import (
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"math/rand"
	"time"
)

var BackgroundTracks = []*pbcore.BackgroundTrack{
	{
		Id:   "fast-beat",
		Name: "Fast Beat",
		Url:  "https://storage.googleapis.com/coasterai-public/background_music/FastBeat.mp3",
	},
	{
		Id:   "rythymic",
		Name: "Rythymic",
		Url:  "https://storage.googleapis.com/coasterai-public/background_music/Rythymic.mov",
	},
}

var rng = rand.New(rand.NewSource(time.Now().UnixNano()))

func GenerateBackgroundMusic() *pbcore.BackgroundTrack {
	return BackgroundTracks[rng.Intn(len(BackgroundTracks))]
}
