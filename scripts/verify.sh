#!/bin/bash
set -euo pipefail

scripts/test-install-config.sh
bun run build
