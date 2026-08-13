#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mdbook_bin="${MDBOOK_BIN:-mdbook}"

"$mdbook_bin" build "$project_dir"

staging_dir="$(mktemp -d "${TMPDIR:-/tmp}/rust-api-field-guide.XXXXXX")"
trap 'rm -rf "$staging_dir"' EXIT

for edition in problem-first example-led workshop; do
  edition_dir="$staging_dir/$edition"
  mkdir -p "$edition_dir"
  cp -R "$project_dir/src" "$edition_dir/src"
  cp -R "$project_dir/theme" "$edition_dir/theme"
  cp "$project_dir/editions/$edition/book.toml" "$edition_dir/book.toml"
  cp "$project_dir/editions/$edition/SUMMARY.md" "$edition_dir/src/SUMMARY.md"
  cp "$project_dir/editions/$edition/README.md" "$edition_dir/src/README.md"
  if [[ "$edition" == "example-led" ]]; then
    source_edition="example-led"
  else
    source_edition="$edition"
  fi
  cp "$project_dir/src/experiments/$source_edition/request.md" "$edition_dir/src/02-ownership-is-api-design.md"
  cp "$project_dir/src/experiments/$source_edition/construction.md" "$edition_dir/src/05-builders-and-typed-payloads.md"
  cp "$project_dir/src/experiments/$source_edition/retry.md" "$edition_dir/src/11-retry-and-replayability.md"
  "$mdbook_bin" build "$edition_dir" -d "$project_dir/book/editions/$edition"
done
