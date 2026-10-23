#!/usr/bin/env bash
# muster.is/install.sh, served by GitHub Pages from this repository:
#
#   curl -fsSL https://muster.is/install.sh | bash
#
# Runs the install.sh of Muster's latest release, so this file never changes with a release.
# The real installer is scripts/install.sh in the private cli repository.
set -euo pipefail

script="$(curl -fsSL https://github.com/musteryourskills/releases/releases/latest/download/install.sh)" || {
  printf "muster: Couldn't reach Muster's releases. Check your connection and try again.\n" >&2
  exit 1
}
exec bash -c "$script"
