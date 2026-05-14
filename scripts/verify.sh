#!/bin/bash
set -euo pipefail

scripts/test-install-config.sh
bun run check
bun test
bun run build
