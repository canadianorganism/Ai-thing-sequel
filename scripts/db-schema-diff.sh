#!/usr/bin/env bash
# Schema-diff guard for the auth → profiles wiring.
#
# Compares the live DB definition of:
#   1. trigger `on_auth_user_created` on auth.users
#   2. column shape of public.profiles
# against pinned snapshots in scripts/schema-snapshots/.
#
# Fails CI if a migration silently changed or dropped either one.
# To intentionally update the contract, regenerate the snapshot files
# and review the diff in the PR.
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" && -z "${PGHOST:-}" ]]; then
  echo "ERROR: DATABASE_URL (or PG* env vars) must be set" >&2
  exit 2
fi

PSQL=(psql -X -A -t --set=ON_ERROR_STOP=1)
if [[ -n "${DATABASE_URL:-}" ]]; then
  PSQL+=("$DATABASE_URL")
fi

SNAP_DIR="$(cd "$(dirname "$0")" && pwd)/schema-snapshots"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

run_sql() { "${PSQL[@]}" -c "$1"; }

# Diff two files. Prefer GNU `diff -u` (always present on CI runners).
# Fall back to a bash-only equality check so the script still works in
# minimal sandboxes that lack diffutils.
diff_files() {
  local expected="$1" actual="$2"
  if command -v diff >/dev/null 2>&1; then
    diff -u "$expected" "$actual"
  else
    if [[ "$(cat "$expected")" == "$(cat "$actual")" ]]; then
      return 0
    fi
    echo "--- expected: $expected"
    cat "$expected"
    echo "--- actual:   $actual"
    cat "$actual"
    return 1
  fi
}

echo "==> [1/2] diff trigger on_auth_user_created"
run_sql "
  SELECT pg_get_triggerdef(t.oid, true)
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='auth' AND c.relname='users'
    AND t.tgname='on_auth_user_created' AND NOT t.tgisinternal;
" > "$TMP_DIR/auth-trigger.actual.sql"

if [[ ! -s "$TMP_DIR/auth-trigger.actual.sql" ]]; then
  echo "ERROR: trigger on_auth_user_created is missing on auth.users" >&2
  exit 1
fi

if ! diff_files "$SNAP_DIR/auth-trigger.expected.sql" "$TMP_DIR/auth-trigger.actual.sql"; then
  echo "ERROR: trigger definition drifted from snapshot" >&2
  echo "  If this change is intentional, update scripts/schema-snapshots/auth-trigger.expected.sql" >&2
  exit 1
fi
echo "    ✓ trigger matches snapshot"

echo "==> [2/2] diff public.profiles column shape"
run_sql "
  SELECT column_name||'|'||data_type||'|'||is_nullable||'|'||COALESCE(column_default,'')
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='profiles'
  ORDER BY column_name;
" > "$TMP_DIR/profiles-columns.actual.txt"

if [[ ! -s "$TMP_DIR/profiles-columns.actual.txt" ]]; then
  echo "ERROR: public.profiles table is missing" >&2
  exit 1
fi

if ! diff_files "$SNAP_DIR/profiles-columns.expected.txt" "$TMP_DIR/profiles-columns.actual.txt"; then
  echo "ERROR: public.profiles column shape drifted from snapshot" >&2
  echo "  If this change is intentional, update scripts/schema-snapshots/profiles-columns.expected.txt" >&2
  exit 1
fi
echo "    ✓ profiles columns match snapshot"

echo "==> Schema diff passed ✓"
