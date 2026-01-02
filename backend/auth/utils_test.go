package auth

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func Test_isAdminPath(t *testing.T) {

	assert.Equal(t, false, isAdminPath("/coasterai.portal.v1.PortalService/GetConfig"))
	assert.Equal(t, true, isAdminPath("/coasterai.portal.v1.AdminService/GetUser"))
}
