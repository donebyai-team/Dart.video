package code_builder

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"github.com/shank318/coasterai/baml_client/types"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/utils"
	"go.uber.org/zap"
	"google.golang.org/protobuf/types/known/structpb"

	"strings"
)

const (
	BUILD_ERROR_TYPE_DEFAULTS = "default_data_not_extracted"
)

// BuildError is returned by TemplateCodeBuilder when the generated code
// fails to compile or render. Use errors.As to detect it and feed the Errors
// back to the LLM for self-correction.
//
// Internal/infrastructure failures are returned as plain errors and must NOT
// be fed to the LLM.
type BuildError struct {
	// ErrorType is the validator's error_type, currently "compile_error",
	// "rule_not_enforced", or "render_error".
	ErrorType string
	// Errors contains the compiler or runtime error messages.
	Errors []string
}

func (e *BuildError) Error() string {
	return fmt.Sprintf("%s: %s", e.ErrorType, strings.Join(e.Errors, "; "))
}

// CodeBuilder compiles an LLM-generated Remotion component,
// renders a still frame to confirm it runs, and uploads the CDN JS to GCS.
type CodeBuilder interface {
	// ValidateAndBuild compiles the component, renders frame 0, and uploads
	// the resulting CDN JS bundle to GCS.
	//
	// On compile/rule/render failure it returns *BuildError — extract with errors.As
	// and feed BuildError.Errors back to the LLM.
	//
	// On infrastructure failure it returns a plain error — do NOT feed to LLM.
	ValidateAndBuild(ctx context.Context, input ValidateAndBuildInput) (*ValidateAndBuildOutput, error)
}

// ValidateAndBuildInput is the request payload sent to the validator service.
type ValidateAndBuildInput struct {
	Animation          *types.GenerateAnimationCodeResponse
	OutputPath         string
	MediaAssetRegistry *services.MediaAssetRegistry
}

// ValidateAndBuildOutput is the response from the validator service on success.
type ValidateAndBuildOutput struct {
	CodeRegistry *pbcore.CodeRegistry
}

type codeBuilderService struct {
	//client     *retryablehttp.Client
	//serviceURL string
	mediaStore services.MediaStore
	logger     *zap.Logger
}

func NewCodeBuilderService(mediaStore services.MediaStore, logger *zap.Logger) CodeBuilder {
	return &codeBuilderService{mediaStore: mediaStore, logger: logger}
}

func (s *codeBuilderService) ValidateAndBuild(
	ctx context.Context,
	input ValidateAndBuildInput,
) (*ValidateAndBuildOutput, error) {
	if input.Animation.Code == "" {
		return nil, fmt.Errorf("code is required")
	}

	if input.OutputPath == "" {
		return nil, fmt.Errorf("output_path is required")
	}

	input.OutputPath = fmt.Sprintf("%s/%s", input.OutputPath, uuid.New().String())

	//if buildErr := staticValidateCode(input.Animation.Code); buildErr != nil {
	//	return nil, buildErr
	//}

	code := input.Animation.Code

	// Sanitize
	code = SanitizeCodeBeforeSaving(code)
	// Resolve media assets
	code = input.MediaAssetRegistry.ResolveMediaHandles(code)

	// TODO: Build and Validate code here, before extraction

	// Extract Defaults
	var defaultData *structpb.Struct
	data, updatedCode, err := ExtractDefaultDataPropsFromGeneratedCode(code)
	if err != nil {
		s.logger.Error("failed to extract defaults", zap.Error(err))
		//return nil, &BuildError{ErrorType: BUILD_ERROR_TYPE_DEFAULTS, Errors: []string{err.Error()}}
	} else if updatedCode != "" && data != nil {
		code = updatedCode

		// Save defaults
		defaultData, err = utils.RawMessageToStruct(data)
		if err != nil {
			return nil, err
		}
	}

	uploadCodeAsset, err := s.mediaStore.UploadCode(ctx, code, input.OutputPath)
	if err != nil {
		return nil, err
	}

	// Save edits
	edits := json.RawMessage(`{}`)
	if input.Animation.ManualEdits != nil {
		raw := []byte(*input.Animation.ManualEdits)

		if !json.Valid(raw) {
			s.logger.Warn("invalid manual edits", zap.String("manual_edits", *input.Animation.ManualEdits))
		} else {
			edits = raw
		}
	}

	toPatches, err := utils.RawMessageToStruct(edits)
	if err != nil {
		return nil, fmt.Errorf("invalid template registry patch")
	}

	s.logger.Info("uploaded generated code",
		zap.String("assigned_ids_url", uploadCodeAsset.Url))

	return &ValidateAndBuildOutput{
		CodeRegistry: &pbcore.CodeRegistry{
			MUrl:     uploadCodeAsset.Url,
			Edits:    toPatches,
			Defaults: defaultData,
		},
	}, nil
}

// NewTemplateCodeBuilderService creates a client for the validator HTTP service.
// serviceURL should be the base URL of the deployed Cloud Run Service,
// e.g. "https://remotion-validator-xyz-uc.a.run.app".
//
// The client retries on 5xx and connection errors (up to 3 attempts) with
// exponential backoff, which handles Cloud Run cold starts gracefully.
//func NewTemplateCodeBuilderService(serviceURL string) TemplateCodeBuilder {
//	rc := retryablehttp.NewClient()
//	rc.RetryMax = 3
//	rc.RetryWaitMin = 2 * time.Second
//	rc.RetryWaitMax = 10 * time.Second
//	// Only retry on connection errors and 5xx — never retry 4xx (build/render errors)
//	rc.CheckRetry = func(ctx context.Context, resp *http.Response, err error) (bool, error) {
//		if err != nil {
//			return retryablehttp.DefaultRetryPolicy(ctx, resp, err)
//		}
//		if resp.StatusCode == http.StatusUnprocessableEntity {
//			return false, nil // build_error / render_error — don't retry
//		}
//		return retryablehttp.DefaultRetryPolicy(ctx, resp, err)
//	}
//	rc.Logger = nil // silence retryablehttp's default stderr logger
//	rc.HTTPClient = &http.Client{Timeout: 5 * time.Minute}
//
//	return &codeBuilderService{
//		client:     rc,
//		serviceURL: strings.TrimRight(serviceURL, "/"),
//	}
//}

// staticValidateCode runs cheap string-level checks on generated TSX before
// sending it to the validator service. Returns *BuildError so the caller can
// feed the message back to the LLM for self-correction.
func staticValidateCode(code string) *BuildError {
	type check struct {
		ok      func(code string) bool
		message string
	}

	checks := []check{
		{
			ok: func(c string) bool {
				return strings.Contains(c, "export default function RemoteComponent")
			},
			message: "missing RemoteComponent contract: code must declare `export default function RemoteComponent()`",
		},
	}

	var errs []string
	for _, c := range checks {
		if !c.ok(code) {
			errs = append(errs, c.message)
		}
	}

	if len(errs) > 0 {
		return &BuildError{ErrorType: "rule_not_enforced", Errors: errs}
	}
	return nil
}

//func (s *codeBuilderService) ValidateAndBuild(
//	ctx context.Context,
//	input *ValidateAndBuildInput,
//) (*ValidateAndBuildOutput, error) {
//	if input == nil {
//		return nil, fmt.Errorf("input is required")
//	}
//	if input.Code == "" {
//		return nil, fmt.Errorf("code is required")
//	}
//
//	if input.OutputPath == "" {
//		return nil, fmt.Errorf("output_path is required")
//	}
//
//	if buildErr := staticValidateCode(input.Code); buildErr != nil {
//		return nil, buildErr
//	}
//
//	body, err := json.Marshal(input)
//	if err != nil {
//		return nil, fmt.Errorf("marshal request: %w", err)
//	}
//
//	req, err := retryablehttp.NewRequestWithContext(
//		ctx,
//		http.MethodPost,
//		s.serviceURL+"/validate",
//		bytes.NewReader(body),
//	)
//	if err != nil {
//		return nil, fmt.Errorf("create request: %w", err)
//	}
//	req.Header.Set("Content-Type", "application/json")
//
//	resp, err := s.client.Do(req)
//	if err != nil {
//		return nil, fmt.Errorf("send request to validator service: %w", err)
//	}
//	defer resp.Body.Close()
//
//	respBody, err := io.ReadAll(resp.Body)
//	if err != nil {
//		return nil, fmt.Errorf("read validator response: %w", err)
//	}
//
//	// 422 = compile_error, rule_not_enforced, or render_error — feed back to LLM
//	if resp.StatusCode == http.StatusUnprocessableEntity {
//		var errResp struct {
//			ErrorType string   `json:"error_type"`
//			Errors    []string `json:"errors"`
//		}
//		if err := json.Unmarshal(respBody, &errResp); err != nil {
//			return nil, fmt.Errorf("parse build error response: %w", err)
//		}
//		return nil, &BuildError{
//			ErrorType: errResp.ErrorType,
//			Errors:    errResp.Errors,
//		}
//	}
//
//	// Any other non-200 is an infrastructure error — do NOT feed to LLM
//	if resp.StatusCode != http.StatusOK {
//		return nil, fmt.Errorf("validator service returned %d: %s", resp.StatusCode, string(respBody))
//	}
//
//	var out ValidateAndBuildOutput
//	if err := json.Unmarshal(respBody, &out); err != nil {
//		return nil, fmt.Errorf("parse validator response: %w", err)
//	}
//
//	return &out, nil
//}
