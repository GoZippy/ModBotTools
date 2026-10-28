param(
  [string]$BaseRef = 'origin/main'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Assert-Exit([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE" }
}

$repo = Split-Path -Parent $PSScriptRoot
$actual = (& git -C $repo rev-parse --show-toplevel).Trim()
Assert-Exit 'Locate repository'
if ([IO.Path]::GetFullPath($actual) -ne [IO.Path]::GetFullPath($repo)) {
  throw "Run this script from its own checkout: $repo"
}

$dirty = @(& git -C $repo status --porcelain --untracked-files=all)
Assert-Exit 'Read worktree state'
if ($dirty.Count -gt 0) {
  throw "Review requires a clean committed worktree. Inspect git status --short in $repo."
}

$head = (& git -C $repo rev-parse HEAD).Trim()
Assert-Exit 'Resolve HEAD'
$base = (& git -C $repo rev-parse $BaseRef).Trim()
Assert-Exit "Resolve $BaseRef"
& git -C $repo merge-base --is-ancestor $base $head
Assert-Exit 'Confirm base is an ancestor of HEAD'

Write-Output "Review checkout: $repo"
Write-Output "Base: $BaseRef $base"
Write-Output "Head: $head"
Write-Output "PowerShell: $($PSVersionTable.PSVersion)"
$nodeVersion = (& node --version).Trim()
Assert-Exit 'Read Node version'
Write-Output "Node: $nodeVersion"
if ([version]$nodeVersion.TrimStart('v') -lt [version]'24.17.0') {
  throw "Node 24.17.0 or newer is required for review; found $nodeVersion."
}

Push-Location $repo
try {
  & npm ci
  Assert-Exit 'npm ci'
  & node scripts/zs/gate.mjs full
  Assert-Exit 'Full gate'
  & git diff --check "$BaseRef...HEAD"
  Assert-Exit 'Diff whitespace check'
  Write-Output "PASS local review: $head"
} finally {
  Pop-Location
}
