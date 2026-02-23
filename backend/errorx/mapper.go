package errorx

import (
	"errors"

	"connectrpc.com/connect"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func ToConnect(err error) error {
	if err == nil {
		return nil
	}
	if connect.CodeOf(err) != connect.CodeUnknown {
		return err
	}

	e, ok := As(err)
	if !ok {
		return connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewError(toConnectCode(e.Code()), errors.New(e.Message()))
}

func ToGRPC(err error) error {
	if err == nil {
		return nil
	}
	e, ok := As(err)
	if !ok {
		return err
	}
	return status.Error(toGRPCCode(e.Code()), e.Message())
}

func FromGRPC(err error) error {
	if err == nil {
		return nil
	}
	st, ok := status.FromError(err)
	if !ok {
		return err
	}
	return New(fromGRPCCode(st.Code()), "", st.Message(), err)
}

func toConnectCode(code Code) connect.Code {
	switch code {
	case CodeInvalidArgument:
		return connect.CodeInvalidArgument
	case CodeNotFound:
		return connect.CodeNotFound
	case CodeAlreadyExists:
		return connect.CodeAlreadyExists
	case CodePermissionDenied:
		return connect.CodePermissionDenied
	case CodeUnauthenticated:
		return connect.CodeUnauthenticated
	case CodeFailedPrecond:
		return connect.CodeFailedPrecondition
	case CodeUnavailable:
		return connect.CodeUnavailable
	case CodeDeadlineExceeded:
		return connect.CodeDeadlineExceeded
	default:
		return connect.CodeInternal
	}
}

func toGRPCCode(code Code) codes.Code {
	switch code {
	case CodeInvalidArgument:
		return codes.InvalidArgument
	case CodeNotFound:
		return codes.NotFound
	case CodeAlreadyExists:
		return codes.AlreadyExists
	case CodePermissionDenied:
		return codes.PermissionDenied
	case CodeUnauthenticated:
		return codes.Unauthenticated
	case CodeFailedPrecond:
		return codes.FailedPrecondition
	case CodeUnavailable:
		return codes.Unavailable
	case CodeDeadlineExceeded:
		return codes.DeadlineExceeded
	default:
		return codes.Internal
	}
}

func fromGRPCCode(code codes.Code) Code {
	switch code {
	case codes.InvalidArgument:
		return CodeInvalidArgument
	case codes.NotFound:
		return CodeNotFound
	case codes.AlreadyExists:
		return CodeAlreadyExists
	case codes.PermissionDenied:
		return CodePermissionDenied
	case codes.Unauthenticated:
		return CodeUnauthenticated
	case codes.FailedPrecondition:
		return CodeFailedPrecond
	case codes.Unavailable:
		return CodeUnavailable
	case codes.DeadlineExceeded:
		return CodeDeadlineExceeded
	default:
		return CodeInternal
	}
}
