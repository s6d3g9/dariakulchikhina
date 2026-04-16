param()

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$hookPath = ".githooks"
$preCommitPath = Join-Path $repoRoot ".githooks/pre-commit"
$postCommitPath = Join-Path $repoRoot ".githooks/post-commit"

if (-not (Test-Path $preCommitPath)) {
  throw "Missing pre-commit hook file at $preCommitPath"
}
if (-not (Test-Path $postCommitPath)) {
  throw "Missing post-commit hook file at $postCommitPath"
}

git config core.hooksPath $hookPath

$configuredPath = git config --get core.hooksPath
if ($configuredPath -ne $hookPath) {
  throw "Failed to configure core.hooksPath. Expected '$hookPath', got '$configuredPath'."
}

# Auto-sync defaults: push current branch, auto-create upstream on first push,
# prune stale remote refs on fetch. Applied per-repo (local config only).
git config push.default current
git config push.autoSetupRemote true
git config fetch.prune true

Write-Host "Git hooks configured successfully."
Write-Host "core.hooksPath=$configuredPath"
Write-Host "Pre-commit will run: pnpm docs:v5:verify"
Write-Host "Post-commit will run: git push (only for branches with an upstream)"
Write-Host ""
Write-Host "Git auto-sync config:"
Write-Host "  push.default=$(git config --get push.default)"
Write-Host "  push.autoSetupRemote=$(git config --get push.autoSetupRemote)"
Write-Host "  fetch.prune=$(git config --get fetch.prune)"
