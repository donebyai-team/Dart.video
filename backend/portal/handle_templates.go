package portal

import (
	"connectrpc.com/connect"
	"context"
	"fmt"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"google.golang.org/protobuf/types/known/emptypb"
	"net/url"
	"strings"
)

func (p *Portal) CreateTemplate(ctx context.Context, c *connect.Request[emptypb.Empty]) (*connect.Response[pbcore.AnimationTemplate], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	if !actor.IsPlatformAdmin() {
		return nil, connect.NewError(connect.CodePermissionDenied, fmt.Errorf("not allowed to create templates"))
	}

	template, err := p.templateService.CreateTemplate(ctx)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(template.ToProto()), nil
}

func (p *Portal) GetTemplates(ctx context.Context, c *connect.Request[emptypb.Empty]) (*connect.Response[pbportal.GetTemplatesResponse], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	if !actor.IsPlatformAdmin() {
		return nil, connect.NewError(connect.CodePermissionDenied, fmt.Errorf("not allowed to create templates"))
	}

	templates, err := p.templateService.GetTemplates(ctx, []string{})
	if err != nil {
		return nil, err
	}

	templatesProto := make([]*pbcore.AnimationTemplate, 0, len(templates))
	for _, template := range templates {
		templatesProto = append(templatesProto, template.ToProto())
	}
	return connect.NewResponse(&pbportal.GetTemplatesResponse{Templates: templatesProto}), nil
}

func (p *Portal) SaveTemplate(ctx context.Context, c *connect.Request[pbportal.UpdateTemplateRequest]) (*connect.Response[emptypb.Empty], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	if !actor.IsPlatformAdmin() {
		return nil, connect.NewError(connect.CodePermissionDenied, fmt.Errorf("not allowed to create templates"))
	}

	if c.Msg.Id == "" ||
		c.Msg.Name == "" ||
		c.Msg.Description == "" ||
		c.Msg.UsageDescription == "" ||
		len(c.Msg.Categories) == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid template arguments"))
	}

	err = p.templateService.UpdateTemplate(ctx, c.Msg)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&emptypb.Empty{}), nil
}

func (p *Portal) GetTemplate(ctx context.Context, c *connect.Request[pbportal.GetTemplateRequest]) (*connect.Response[pbcore.AnimationTemplate], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	if !actor.IsPlatformAdmin() {
		return nil, connect.NewError(connect.CodePermissionDenied, fmt.Errorf("not allowed to create templates"))
	}

	template, err := p.templateService.GetTemplateByID(ctx, c.Msg.Id)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(template.ToProto()), nil
}

func (p *Portal) DeleteTemplate(ctx context.Context, c *connect.Request[pbportal.GetTemplateRequest]) (*connect.Response[emptypb.Empty], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	if !actor.IsPlatformAdmin() {
		return nil, connect.NewError(connect.CodePermissionDenied, fmt.Errorf("not allowed to create templates"))
	}

	err = p.templateService.DeleteTemplateByID(ctx, c.Msg.Id)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&emptypb.Empty{}), nil
}

const templatePrefix = "template:"

func parseResourceID(id string) (resourceID string, isTemplate bool) {
	// Decode URL-encoded values if present.
	if decoded, err := url.PathUnescape(id); err == nil {
		id = decoded
	}

	if strings.HasPrefix(id, templatePrefix) {
		return strings.TrimPrefix(id, templatePrefix), true
	}

	return id, false
}
