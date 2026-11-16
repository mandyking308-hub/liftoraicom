#!/usr/bin/env bash
set -euo pipefail

# Local disposable PostgreSQL only. Never points at hosted QA or production.
ROOT="$(mktemp -d /tmp/knd003-liftor-pg.XXXXXX)"
PORT="${KND003_TEST_PGPORT:-55473}"
RUN_AS_UID="${KND003_TEST_RUN_AS_UID:-1000}"
RUN_AS_GID="${KND003_TEST_RUN_AS_GID:-1000}"

if [[ "$(id -u)" -eq 0 ]]; then
  chown -R "$RUN_AS_UID":"$RUN_AS_GID" "$ROOT"
  as_pg() { setpriv --reuid="$RUN_AS_UID" --regid="$RUN_AS_GID" --clear-groups "$@"; }
else
  as_pg() { "$@"; }
fi

cleanup() {
  if [[ -d "$ROOT/data" ]]; then
    if [[ "$(id -u)" -eq 0 ]]; then
      setpriv --reuid="$RUN_AS_UID" --regid="$RUN_AS_GID" --clear-groups pg_ctl -D "$ROOT/data" -m immediate stop >/dev/null 2>&1 || true
    else
      pg_ctl -D "$ROOT/data" -m immediate stop >/dev/null 2>&1 || true
    fi
  fi
  rm -rf "$ROOT"
}
trap cleanup EXIT

as_pg initdb -D "$ROOT/data" -U postgres -A trust >/dev/null
as_pg pg_ctl -D "$ROOT/data" -o "-p $PORT -k $ROOT -c listen_addresses='127.0.0.1'" -l "$ROOT/postgres.log" -w start >/dev/null

UNIFIED_INBOUND_TEST_DATABASE_URL="postgresql://postgres@127.0.0.1:$PORT/postgres" \
  bunx vitest run src/lib/__tests__/kindnesssPrivacyPostgresIntegration.test.ts "$@"
