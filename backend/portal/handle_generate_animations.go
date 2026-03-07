package portal

import (
	"connectrpc.com/connect"
	"context"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
)

func (p *Portal) GenerateOrEditAnimationSlide(ctx context.Context, c *connect.Request[pbportal.GenerateOrEditAnimationRequest], c2 *connect.ServerStream[pbportal.GenerateOrEditAnimationResponse]) error {
	//TODO implement me
	panic("implement me")
}
