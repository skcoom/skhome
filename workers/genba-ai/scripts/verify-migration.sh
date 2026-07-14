#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${WORKER_DIR}/../.." && pwd)"
CONTAINER_NAME="skhome-genba-ai-pgtest-$$"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:15-alpine}"
DATABASE_NAME="genba_ai_test"

cleanup() {
  docker rm --force "${CONTAINER_NAME}" >/dev/null 2>&1 || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if ! docker info >/dev/null 2>&1; then
  echo "Docker-compatible runtime is not available." >&2
  exit 1
fi

docker run --detach --rm \
  --name "${CONTAINER_NAME}" \
  --env POSTGRES_PASSWORD=local-test-only \
  --env POSTGRES_DB="${DATABASE_NAME}" \
  "${POSTGRES_IMAGE}" >/dev/null

ready=false
for _ in $(seq 1 30); do
  if docker exec "${CONTAINER_NAME}" \
    pg_isready --username postgres --dbname "${DATABASE_NAME}" >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done

if [[ "${ready}" != "true" ]]; then
  docker logs "${CONTAINER_NAME}" >&2
  echo "PostgreSQL did not become ready within 30 seconds." >&2
  exit 1
fi

run_sql() {
  local file="$1"
  docker exec --interactive "${CONTAINER_NAME}" \
    psql --username postgres \
      --dbname "${DATABASE_NAME}" \
      --no-psqlrc \
      --set=ON_ERROR_STOP=on < "${file}"
}

echo "Applying existing-schema contract fixture..."
run_sql "${WORKER_DIR}/test/fixtures/migration-prelude.sql"

echo "Applying genba AI Phase 1 migration..."
run_sql "${REPO_ROOT}/supabase/migrations/20260710000000_genba_ai_phase1.sql"

echo "Verifying migration state transitions..."
run_sql "${WORKER_DIR}/test/fixtures/migration-assertions.sql"

echo "PostgreSQL 15 migration contract test passed."
