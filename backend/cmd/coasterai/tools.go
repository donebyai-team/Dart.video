package main

import (
	. "github.com/streamingfast/cli"
)

var ToolsGroup = Group("tools", "coasterai admin & developer tools",
	toolsIntegrationsGroup,
	toolsTemplatesGroup,
)
