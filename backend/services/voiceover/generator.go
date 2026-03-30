package voiceover

import (
	"math/rand"
	"time"
)

type BackgroundTrack struct {
	ID   string
	Name string
	URL  string
	Icon string
}

var BackgroundTracks = []BackgroundTrack{
	{
		ID:   "deep-calm",
		Name: "Deep Calm",
		URL:  "https://ik.imagekit.io/coasterai/freepik-deep-calm_A4WXzk4Mk.mp3",
	},
	{
		ID:   "next-wave",
		Name: "Next Wave",
		URL:  "https://storage.googleapis.com/coasterai-public/background_music/above-the-next-wave.mp3",
	},
	{
		ID:   "boardroom-groove",
		Name: "Boardroom Groove",
		URL:  "https://storage.googleapis.com/coasterai-public/background_music/boardroom-groove-revolution.mp3",
	},
	{
		ID:   "chasing-the-morning",
		Name: "Chasing the Morning",
		URL:  "https://storage.googleapis.com/coasterai-public/background_music/chasing-the-morning-light.mp3",
	},
}

func GenerateBackgroundMusic() BackgroundTrack {
	rand.Seed(time.Now().UnixNano())
	return BackgroundTracks[rand.Intn(len(BackgroundTracks))]
}
