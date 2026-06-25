package errorx

import "fmt"

type Code string

const (
	CodeInvalidArgument  Code = "INVALID_ARGUMENT"
	CodeNotFound         Code = "NOT_FOUND"
	CodeAlreadyExists    Code = "ALREADY_EXISTS"
	CodePermissionDenied Code = "PERMISSION_DENIED"
	CodeUnauthenticated  Code = "UNAUTHENTICATED"
	CodeFailedPrecond    Code = "FAILED_PRECONDITION"
	CodeUnavailable      Code = "UNAVAILABLE"
	CodeDeadlineExceeded Code = "DEADLINE_EXCEEDED"
	CodeInternal         Code = "INTERNAL"
)

var ErrVersionMismatch = fmt.Errorf("there are changes in another session. Refresh to load the latest version")
