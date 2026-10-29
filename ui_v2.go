//go:build !cli && ui2

package main

import (
	"embed"
	"io/fs"
)

// Built with `-tags ui2`: serve the Orbit frontend from frontend-v2/dist.
//
//go:embed all:frontend-v2/dist
var assetsV2 embed.FS

func uiAssets() fs.FS {
	sub, err := fs.Sub(assetsV2, "frontend-v2/dist")
	if err != nil {
		panic(err)
	}
	return sub
}

func uiWindowSize() (width, height int, resizable bool) { return 920, 620, true }
