package scenes

import "github.com/shank318/coasterai/baml_client/types"

var TemplateCategories = []types.Category{
	{
		Name:        "HOOK",
		Description: "An attention-grabbing statement, question, fact, story, or claim designed to immediately capture interest and draw the audience into the message.",
	},
	{
		Name:        "INTRO",
		Description: "Introduces, announces, reveals, or presents a company, product, feature, person, brand, topic, update, or key idea to establish context for the audience.",
	},
	{
		Name:        "PROBLEM",
		Description: "Describes a pain point, challenge, frustration, inefficiency, risk, or undesirable situation that the audience experiences.",
	},
	{
		Name:        "FRAGMENTATION",
		Description: "Highlights disconnected tools, scattered information, siloed teams, complex workflows, or fragmented processes that create inefficiency, confusion, or operational friction.",
	},
	{
		Name:        "SOLUTION",
		Description: "Presents a product, feature, approach, capability, benefit, or use case that solves, improves, automates, simplifies, or eliminates a problem.",
	},
	{
		Name:        "PRODUCT_DEMO",
		Description: "Shows, demonstrates, or walks through the product, user interface, workflow, feature behavior, or customer experience in action.",
	},
	{
		Name:        "SOCIAL_PROOF",
		Description: "Provides evidence of credibility, effectiveness, or market validation through testimonials, customer stories, reviews, statistics, research, adoption, or measurable results.",
	},
	{
		Name:        "CTA",
		Description: "Encourages the audience to take a specific action such as signing up, booking a demo, starting a trial, purchasing, contacting sales, or learning more.",
	},
	{
		Name:        "FEATURES",
		Description: "Describes specific product capabilities, functionality, components, integrations, benefits, or use cases that help deliver the solution.",
	},
}
