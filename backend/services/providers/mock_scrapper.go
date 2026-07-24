package providers

import "context"

type mockScrapper struct {
}

func (m mockScrapper) Scrape(ctx context.Context, req ScrapeRequest) (*ScrapeResponse, error) {
	return &ScrapeResponse{
		Success: true,
		Data: struct {
			Branding BrandingResponse       `json:"branding"`
			Metadata map[string]interface{} `json:"metadata"`
			Markdown string                 `json:"markdown"`
		}{
			Markdown: markdownImageRegex.ReplaceAllString(mockWebsiteContent, ""),
		},
		Error: "",
	}, nil
}

func NewMockScrapper() Scrapper {
	return mockScrapper{}
}
