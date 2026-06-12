package scenes

import "github.com/shank318/coasterai/baml_client/types"

var TemplateCategories = []types.Category{
	{
		Name:        "HOOK",
		Description: "An attention-grabbing statement, question, fact, or claim designed to immediately capture interest.",
	},
	{
		Name:        "PROBLEM",
		Description: "Describes a pain point, challenge, frustration, inefficiency, risk, or undesirable situation.",
	},
	{
		Name:        "SOLUTION",
		Description: "Presents a way to solve, improve, automate, simplify, or eliminate a problem.",
	},
	{
		Name:        "REVEAL",
		Description: "Introduces or unveils the key idea, product, feature, insight, or answer after building curiosity.",
	},
	{
		Name:        "CTA",
		Description: "Encourages the audience to take an action such as signing up, booking a demo, purchasing, or learning more.",
	},
	{
		Name:        "INTRO",
		Description: "Introduces a company, product, feature, person, topic, or announcement.",
	},
	{
		Name:        "OUTRO",
		Description: "Concludes the message with a closing statement, recap, farewell, or final takeaway.",
	},
	{
		Name:        "SOCIAL_PROOF",
		Description: "Provides evidence of credibility or success through testimonials, customer results, reviews, statistics, or adoption.",
	},
}
