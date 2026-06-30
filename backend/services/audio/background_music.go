package audio

import (
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"math/rand"
	"time"
)

var BackgroundTracks = []*pbcore.BackgroundTrack{
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
		Id:   "up-beat",
		Name: "UpBeat",
		Url:  "https://storage.googleapis.com/coasterai-public/background_music/upbeat.mp3",
	},
	{
		Id:   "future-pass",
		Name: "Future Pass",
		Url:  "https://storage.googleapis.com/coasterai-public/background_music/future-pass.mp3",
	},
	{
		Id:   "deep-electronic",
		Name: "Deep Electronic",
		Url:  "https://storage.googleapis.com/coasterai-public/background_music/Deep%20Electronic.mp3",
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

var rng = rand.New(rand.NewSource(time.Now().UnixNano()))

func GenerateBackgroundMusic() *pbcore.BackgroundTrack {
	return BackgroundTracks[rng.Intn(len(BackgroundTracks))]
}
