#!/usr/bin/env bash
# Smoke test: ensures `vite build` succeeds and the built app boots via `vite preview`.
# Used after dependency changes to catch broken installs / type/runtime regressions.
#
# Artifacts (persisted to $ARTIFACTS_DIR, default ./artifacts):
#   - dist/                  : the vite build output (always, on successful build)
#   - preview.log            : full stdout/stderr of `vite preview` (only on failure)
#   - smoke-test.log         : this script's own output (written by the CI workflow)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-4321}"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-$ROOT/artifacts}"
mkdir -p "$ARTIFACTS_DIR"

LOG="$(mktemp)"
FAILED=0

cleanup() {
  if [[ -n "${PREVIEW_PID:-}" ]]; then
    kill "$PREVIEW_PID" 2>/dev/null || true
    wait "$PREVIEW_PID" 2>/dev/null || true
  fi
  # On failure, persist the preview log as an artifact so CI can upload it.
  if [[ "$FAILED" -eq 1 && -s "$LOG" ]]; then
    cp "$LOG" "$ARTIFACTS_DIR/preview.log" || true
    echo "    preview log saved to $ARTIFACTS_DIR/preview.log" >&2
  fi
  rm -f "$LOG"
}
trap cleanup EXIT

echo "==> [1/2] vite build"
npx vite build

# Persist the build output as a CI artifact.
if [[ -d "$ROOT/dist" ]]; then
  rm -rf "$ARTIFACTS_DIR/dist"
  cp -r "$ROOT/dist" "$ARTIFACTS_DIR/dist"
  echo "    build output saved to $ARTIFACTS_DIR/dist"
fi

echo "==> [2/2] vite preview startup check (port $PORT)"
npx vite preview --port "$PORT" >"$LOG" 2>&1 &
PREVIEW_PID=$!

ready=0
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" || echo "000")
  if [[ "$code" == "200" ]]; then
    ready=1
    echo "    server responded 200 after ${i}s"
    break
  fi
  sleep 1
done

if [[ "$ready" -ne 1 ]]; then
  FAILED=1
  echo "ERROR: preview server did not become ready" >&2
  cat "$LOG" >&2
  exit 1
fi

echo "==> Smoke test passed ✓"
