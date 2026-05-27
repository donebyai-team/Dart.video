package voiceover

import (
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"math/rand"
	"time"
)

var BackgroundTracks = []pbcore.BackgroundTrack{
	{
		Id:   "deep-calm",
		Name: "Deep Calm",
		Url:  "https://ik.imagekit.io/coasterai/freepik-deep-calm_A4WXzk4Mk.mp3",
	},
	{
		Id:   "fast-beat",
		Name: "Fast Beat",
		Url:  "https://storage.googleapis.com/coasterai-public/background_music/FastBeat.mp3",
	},
	{
		Id:   "dance-groove",
		Name: "Dance Groove",
		Url:  "https://storage.googleapis.com/coasterai-public/background_music/DanceGroove.mp3",
	},
	{
		Id:   "steady-rise",
		Name: "Steady Rise",
		Url:  "https://storage.googleapis.com/coasterai-public/background_music/The_Steady_Rise.mp3",
	},
	{
		Id:   "upward-trajectory",
		Name: "Upward Trajectory",
		Url:  "https://storage.googleapis.com/coasterai-public/background_music/Upward_Trajectory.mp3",
	},
	{
		Id:   "next-wave",
		Name: "Next Wave",
		Url:  "https://storage.googleapis.com/coasterai-public/background_music/above-the-next-wave.mp3",
	},
	{
		Id:   "boardroom-groove",
		Name: "Boardroom Groove",
		Url:  "https://storage.googleapis.com/coasterai-public/background_music/boardroom-groove-revolution.mp3",
	},
	{
		Id:   "chasing-the-morning",
		Name: "Chasing the Morning",
		Url:  "https://storage.googleapis.com/coasterai-public/background_music/chasing-the-morning-light.mp3",
	},
}

func GenerateBackgroundMusic() pbcore.BackgroundTrack {
	rand.Seed(time.Now().UnixNano())
	return BackgroundTracks[rand.Intn(len(BackgroundTracks))]
}
