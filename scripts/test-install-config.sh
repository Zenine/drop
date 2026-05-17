#!/bin/bash
set -euo pipefail

source_line="$(grep '^REPO=' install.sh)"
alias_line="$(grep 'ln -sf .*drop-preview' install.sh)"

eval "unset DROP_REPO GITHUB_REPOSITORY; ${source_line}"
test "$REPO" = "junping1/drop"

eval "DROP_REPO=owner/drop; GITHUB_REPOSITORY=ignored/repo; ${source_line}"
test "$REPO" = "owner/drop"

eval "unset DROP_REPO; GITHUB_REPOSITORY=some-org/some-app; ${source_line}"
test "$REPO" = "junping1/drop"

test -n "$alias_line"
