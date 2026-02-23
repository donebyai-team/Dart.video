package errorx

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
