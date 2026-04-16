param()

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$hookPath = ".githooks"
$preCommitPath = Join-Path $repoRoot ".githooks/pre-commit"

if (-not (Test-Path $preCommitPath)) {
  throw "Missing pre-commit hook file at $preCommitPath"
}

git config core.hooksPath $hookPath

$configuredPath = git config --get core.hooksPath
if ($configuredPath -ne $hookPath) {
  throw "Failed to configure core.hooksPath. Expected '$hookPath', got '$configuredPath'."
}

Write-Host "Git hooks configured successfully."
Write-Host "core.hooksPath=$configuredPath"
Write-Host "Pre-commit will run: pnpm docs:v5:verify"
