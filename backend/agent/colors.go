package agent

import "math/rand"

var palette = []string{
	"#FF6B6B",
	"#4ECDC4",
	"#45B7D1",
	"#96CEB4",
	"#FFEAA7",
	"#D63031",
	"#6C5CE7",
	"#00B894",
	"#0984E3",
	"#E84393",
}

func pickRandomColor() string {
	if len(palette) == 0 {
		return "#000000" // fallback
	}

	return palette[rand.Intn(len(palette))]
}
