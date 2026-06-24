package portal

import (
	"connectrpc.com/connect"
	"context"
	"fmt"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"google.golang.org/protobuf/types/known/emptypb"
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
		if template.Config == nil ||
			template.Metadata == nil ||
			len(template.Config.Sections) == 0 {
			continue
		}

		// For templates, we don't send bg
		for _, section := range template.Config.Sections {
			for _, slide := range section.Slides {
				slide.BackgroundStyle = nil
			}
		}
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
		c.Msg.Description == "" ||
		len(c.Msg.Description) > 150 ||
		len(c.Msg.Categories) == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument,
			fmt.Errorf("invalid template arguments, max length of name and description is 10 and 150 characters respectively, and categories must be provided"))
	}

	err = p.templateService.UpdateTemplate(ctx, c.Msg)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
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
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}
	return connect.NewResponse(&emptypb.Empty{}), nil
}
