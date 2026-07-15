package portal

import (
	"connectrpc.com/connect"
	"context"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services/templates"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func (p *Portal) GetCredits(ctx context.Context, c *connect.Request[pbcore.GetCreditsRequest]) (*connect.Response[pbcore.GetCreditsResponse], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	referenceID := c.Msg.ReferenceID
	if referenceID != nil {
		resourceID, _ := templates.ParseResourceID(*referenceID)
		referenceID = &resourceID
	}

	available, err := p.creditsService.GetAvailableCredits(ctx, actor.OrganizationID, referenceID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	resp := &pbcore.GetCreditsResponse{Available: int32(available)}
	if c.Msg.GetLedger() {
		entries, err := p.creditsService.GetRechargeHistory(ctx, actor.OrganizationID)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}

		resp.Entries = make([]*pbcore.CreditLedgerEntry, 0, len(entries))
		for _, entry := range entries {
			resp.Entries = append(resp.Entries, &pbcore.CreditLedgerEntry{
				Id:        entry.ID,
				CreatedAt: timestamppb.New(entry.CreatedAt),
				Amount:    int32(entry.Amount),
				Action:    entry.Action,
			})
		}
	}

	return connect.NewResponse(resp), nil
}
