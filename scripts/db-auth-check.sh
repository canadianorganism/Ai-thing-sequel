#!/usr/bin/env bash
# DB sanity check: verifies the auth → profiles wiring is intact.
#
# Asserts:
#   1. Trigger `on_auth_user_created` exists on `auth.users`.
#   2. Row-Level Security is enabled on `public.profiles`.
#   3. `public.profiles` has at least one RLS policy defined.
#
# Requires: DATABASE_URL (or PG* env vars) pointing at the target Supabase Postgres.
# In CI this is provided as the `SUPABASE_DB_URL` secret and exported as DATABASE_URL.
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" && -z "${PGHOST:-}" ]]; then
  echo "ERROR: DATABASE_URL (or PG* env vars) must be set" >&2
  exit 2
fi

PSQL=(psql -X -A -t --set=ON_ERROR_STOP=1)
if [[ -n "${DATABASE_URL:-}" ]]; then
  PSQL+=("$DATABASE_URL")
fi

run_sql() { "${PSQL[@]}" -c "$1"; }

echo "==> [1/3] checking trigger on_auth_user_created on auth.users"
trigger_count=$(run_sql "
  SELECT count(*) FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'auth'
    AND c.relname = 'users'
    AND t.tgname = 'on_auth_user_created'
    AND NOT t.tgisinternal;
")
if [[ "$trigger_count" -lt 1 ]]; then
  echo "ERROR: trigger 'on_auth_user_created' is missing on auth.users" >&2
  exit 1
fi
echo "    ✓ trigger present"

echo "==> [2/3] checking RLS enabled on public.profiles"
rls_enabled=$(run_sql "
  SELECT c.relrowsecurity FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'profiles';
")
if [[ "$rls_enabled" != "t" ]]; then
  echo "ERROR: RLS is not enabled on public.profiles (got '$rls_enabled')" >&2
  exit 1
fi
echo "    ✓ RLS enabled"

echo "==> [3/3] checking public.profiles has RLS policies"
policy_count=$(run_sql "
  SELECT count(*) FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'profiles';
")
if [[ "$policy_count" -lt 1 ]]; then
  echo "ERROR: public.profiles has no RLS policies defined" >&2
  exit 1
fi
echo "    ✓ $policy_count policy(ies) found"

echo "==> DB auth check passed ✓"
