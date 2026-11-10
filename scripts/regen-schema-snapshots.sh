#!/usr/bin/env bash
# Regenerate the pinned schema snapshots used by scripts/db-schema-diff.sh.
#
# Run this AFTER an intentional migration that changes either:
#   - the `on_auth_user_created` trigger on auth.users, or
#   - the `public.profiles` column shape
#
# Usage:
#   DATABASE_URL=postgres://... bash scripts/regen-schema-snapshots.sh
#   # or with PG* env vars already exported:
#   bash scripts/regen-schema-snapshots.sh
#
# Then review the diff in `scripts/schema-snapshots/` and commit it as part
# of the same PR as the migration so reviewers see the contract change.
#
# Pass --check to verify the snapshots are up-to-date without writing
# (useful as a local pre-commit guard). Exits non-zero if drift exists.
set -euo pipefail

CHECK_ONLY=0
if [[ "${1:-}" == "--check" ]]; then
  CHECK_ONLY=1
fi

if [[ -z "${DATABASE_URL:-}" && -z "${PGHOST:-}" ]]; then
  echo "ERROR: DATABASE_URL (or PG* env vars) must be set" >&2
  exit 2
fi

PSQL=(psql -X -A -t --set=ON_ERROR_STOP=1)
if [[ -n "${DATABASE_URL:-}" ]]; then
  PSQL+=("$DATABASE_URL")
fi

SNAP_DIR="$(cd "$(dirname "$0")" && pwd)/schema-snapshots"
mkdir -p "$SNAP_DIR"

TRIGGER_SQL="
  SELECT pg_get_triggerdef(t.oid, true)
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='auth' AND c.relname='users'
    AND t.tgname='on_auth_user_created' AND NOT t.tgisinternal;
"

PROFILES_SQL="
  SELECT column_name||'|'||data_type||'|'||is_nullable||'|'||COALESCE(column_default,'')
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='profiles'
  ORDER BY column_name;
"

write_or_check() {
  local target="$1" sql="$2" label="$3"
  local tmp
  tmp="$(mktemp)"
  "${PSQL[@]}" -c "$sql" > "$tmp"

  if [[ ! -s "$tmp" ]]; then
    echo "ERROR: $label query returned no rows — refusing to write empty snapshot" >&2
    rm -f "$tmp"
    exit 1
  fi

  if [[ "$CHECK_ONLY" -eq 1 ]]; then
    if [[ ! -f "$target" ]] || [[ "$(cat "$tmp")" != "$(cat "$target")" ]]; then
      echo "DRIFT: $target is out of date" >&2
      rm -f "$tmp"
      return 1
    fi
    echo "    ✓ $label up-to-date"
    rm -f "$tmp"
  else
    mv "$tmp" "$target"
    echo "    ✓ wrote $target"
  fi
}

echo "==> regenerating snapshots in $SNAP_DIR"

drift=0
write_or_check "$SNAP_DIR/auth-trigger.expected.sql" "$TRIGGER_SQL" "auth trigger" || drift=1
write_or_check "$SNAP_DIR/profiles-columns.expected.txt" "$PROFILES_SQL" "profiles columns" || drift=1

if [[ "$CHECK_ONLY" -eq 1 ]]; then
  if [[ "$drift" -ne 0 ]]; then
    echo "==> snapshots are stale — run without --check to regenerate" >&2
    exit 1
  fi
  echo "==> snapshots up-to-date ✓"
else
  echo "==> done. Review the diff in $SNAP_DIR and commit it with your migration."
fi
