# Build script for gotohp on Windows
# Always creates a uniquely timestamped .exe in bin/ so previous builds are never replaced.

[CmdletBinding()]
param (
    [switch]$Cli,
    [switch]$Dev,
    [string]$Out
)

$ErrorActionPreference = "Stop"

# Auto-detect Go in local SDK if not in PATH
if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
    $defaultGo = "$env:LOCALAPPDATA\go_sdk\go\bin"
    if (Test-Path "$defaultGo\go.exe") {
        $env:PATH = "$defaultGo;$env:PATH"
    }
}

# 1. Build frontend if building GUI app
if (-not $Cli) {
    Write-Host "==> Building frontend..." -ForegroundColor Cyan
    Push-Location frontend
    npm run build
    Pop-Location
}

# 2. Ensure bin directory exists
if (-not (Test-Path "bin")) {
    New-Item -ItemType Directory -Path "bin" | Out-Null
}

# 3. Determine unique output file name with timestamp
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
if (-not $Out) {
    if ($Cli) {
        $Out = "bin/gotohp-cli-$timestamp.exe"
    } else {
        $Out = "bin/gotohp-$timestamp.exe"
    }
}

# 4. Compile with Go
Write-Host "==> Compiling $Out..." -ForegroundColor Cyan
if ($Cli) {
    $tags = "cli"
    $ldflags = "-w -s"
    if ($Dev) {
        go build -tags $tags -buildvcs=false -gcflags=all="-l" -o $Out
    } else {
        go build -tags $tags -trimpath -buildvcs=false -ldflags "$ldflags" -o $Out
    }
} else {
    $tags = "production"
    $ldflags = "-w -s -H windowsgui"
    if ($Dev) {
        go build -tags $tags -buildvcs=false -gcflags=all="-l" -o $Out
    } else {
        go build -tags $tags -trimpath -buildvcs=false -ldflags "$ldflags" -o $Out
    }
}

Write-Host "==> Successfully created new build: $Out" -ForegroundColor Green
