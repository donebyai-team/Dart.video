package errorx

import (
	"errors"
	"fmt"
)

type Error struct {
	code    Code
	reason  string
	message string
	cause   error
}

func New(code Code, reason, message string, cause error) *Error {
	return &Error{
		code:    code,
		reason:  reason,
		message: message,
		cause:   cause,
	}
}

func (e *Error) Error() string {
	if e == nil {
		return ""
	}
	if e.message != "" {
		return e.message
	}
	if e.cause != nil {
		return e.cause.Error()
	}
	return string(e.code)
}

func (e *Error) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.cause
}

func (e *Error) Code() Code {
	if e == nil {
		return CodeInternal
	}
	return e.code
}

func (e *Error) Reason() string {
	if e == nil {
		return ""
	}
	return e.reason
}

func (e *Error) Message() string {
	if e == nil {
		return ""
	}
	return e.message
}

func As(err error) (*Error, bool) {
	if err == nil {
		return nil, false
	}
	var e *Error
	if errors.As(err, &e) {
		return e, true
	}
	return nil, false
}

func IsCode(err error, code Code) bool {
	e, ok := As(err)
	return ok && e.code == code
}

func Wrap(code Code, reason, message string, cause error) error {
	return New(code, reason, message, cause)
}

func Wrapf(code Code, reason string, cause error, format string, args ...any) error {
	return New(code, reason, fmt.Sprintf(format, args...), cause)
}
