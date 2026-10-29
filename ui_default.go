//go:build !cli && !ui2

package main

import (
	"io/fs"
)

// uiAssets returns the embedded frontend served by the window.
func uiAssets() fs.FS { return assets }

// uiWindowSize returns the window width, height and whether it may be resized.
func uiWindowSize() (width, height int, resizable bool) { return 400, 600, false }
