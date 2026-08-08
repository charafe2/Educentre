#!/usr/bin/env bash
# Dead-man's-switch for the docker compose stack, meant to run via cron every
# few minutes. Pings healthchecks.io on success; on any stopped/unhealthy
# container it pings the /fail endpoint immediately instead of waiting for
# healthchecks.io's grace period to expire.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
[ -f "$SCRIPT_DIR/.env.monitor" ] && source "$SCRIPT_DIR/.env.monitor"

HEALTHCHECKS_URL="${HEALTHCHECKS_URL:?Set HEALTHCHECKS_URL in docker/scripts/.env.monitor or the environment}"

CONTAINERS=(saas-postgres saas-redis saas-php-fpm saas-reverb saas-queue-worker saas-nginx)
failed=()

for name in "${CONTAINERS[@]}"; do
  status=$(docker inspect --format='{{.State.Status}}' "$name" 2>/dev/null) || { failed+=("$name:missing"); continue; }
  if [ "$status" != "running" ]; then
    failed+=("$name:$status")
    continue
  fi

  health=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$name" 2>/dev/null)
  if [ -n "$health" ] && [ "$health" != "healthy" ]; then
    failed+=("$name:$health")
  fi
done

if [ "${#failed[@]}" -eq 0 ]; then
  curl -fsS -m 10 --retry 3 "$HEALTHCHECKS_URL" >/dev/null
else
  msg="Unhealthy containers: ${failed[*]}"
  echo "$msg" >&2
  curl -fsS -m 10 --retry 3 "$HEALTHCHECKS_URL/fail" --data-raw "$msg" >/dev/null
fi
