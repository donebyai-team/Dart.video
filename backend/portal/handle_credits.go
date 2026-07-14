package portal

import (
	"connectrpc.com/connect"
	"context"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
)

func (p *Portal) GetCredits(ctx context.Context, c *connect.Request[pbcore.GetCreditsRequest]) (*connect.Response[pbcore.GetCreditsResponse], error) {
	//TODO implement me
	panic("implement me")
}
