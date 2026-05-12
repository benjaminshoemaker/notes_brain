#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.local"

usage() {
  cat <<'EOF'
Usage:
  scripts/e2e/local-supabase-e2e-env.sh --print-exports
  scripts/e2e/local-supabase-e2e-env.sh --write-file

Modes:
  --print-exports  Print shell-safe export lines for E2E_SUPABASE_* vars.
  --write-file     Upsert E2E_SUPABASE_* keys in .env.local at the repo root.
EOF
}

strip_wrapping_quotes() {
  local value="$1"
  local first_char last_char

  if [ "${#value}" -lt 2 ]; then
    printf "%s" "${value}"
    return 0
  fi

  first_char="${value:0:1}"
  last_char="${value: -1}"

  if [ "${first_char}" = "${last_char}" ] && { [ "${first_char}" = "\"" ] || [ "${first_char}" = "'" ]; }; then
    printf "%s" "${value:1:${#value}-2}"
    return 0
  fi

  printf "%s" "${value}"
}

load_key_from_env_file() {
  local key="$1"
  local raw_value value

  raw_value="$(awk -v key="${key}" '
    $0 ~ "^[[:space:]]*" key "=" {
      line = $0
      sub(/^[[:space:]]*/, "", line)
      sub(/^[^=]*=/, "", line)
      value = line
    }
    END {
      if (value == "") {
        exit 1
      }
      print value
    }
  ' "${ENV_FILE}")" || return 1

  value="$(strip_wrapping_quotes "${raw_value}")"
  export "${key}=${value}"
  return 0
}

load_from_env_file() {
  if [ ! -f "${ENV_FILE}" ]; then
    return 1
  fi

  local found=1
  local key
  for key in \
    E2E_SUPABASE_URL \
    E2E_SUPABASE_ANON_KEY \
    E2E_SUPABASE_SECRET_KEY \
    E2E_SUPABASE_SERVICE_ROLE_KEY \
    SUPABASE_URL \
    SUPABASE_ANON_KEY \
    SUPABASE_SERVICE_ROLE_KEY \
    SERVICE_ROLE_KEY \
    VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY \
    EXPO_PUBLIC_SUPABASE_URL \
    EXPO_PUBLIC_SUPABASE_ANON_KEY
  do
    if load_key_from_env_file "${key}"; then
      found=0
    fi
  done

  return "${found}"
}

load_from_supabase_status() {
  if ! command -v supabase >/dev/null 2>&1; then
    echo "supabase CLI is not installed." >&2
    return 1
  fi

  local status_output
  if ! status_output="$(cd "${ROOT_DIR}" && supabase status -o env 2>/dev/null)"; then
    echo "Unable to read 'supabase status -o env'." >&2
    return 1
  fi

  local env_lines
  env_lines="$(printf '%s\n' "${status_output}" | grep -E '^[A-Z0-9_]+=')"
  if [ -z "${env_lines}" ]; then
    echo "No environment lines were returned by 'supabase status -o env'." >&2
    return 1
  fi

  # The CLI output is KEY="VALUE" lines; evaluate only the filtered lines.
  # shellcheck disable=SC2086
  eval "${env_lines}"
  return 0
}

map_to_e2e() {
  export E2E_SUPABASE_URL="${E2E_SUPABASE_URL:-${API_URL:-${SUPABASE_URL:-${VITE_SUPABASE_URL:-${EXPO_PUBLIC_SUPABASE_URL:-}}}}}"
  export E2E_SUPABASE_ANON_KEY="${E2E_SUPABASE_ANON_KEY:-${ANON_KEY:-${SUPABASE_ANON_KEY:-${VITE_SUPABASE_ANON_KEY:-${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}}}}}"

  if [ -z "${E2E_SUPABASE_SECRET_KEY:-}" ]; then
    if [ -n "${SECRET_KEY:-}" ]; then
      export E2E_SUPABASE_SECRET_KEY="${SECRET_KEY}"
    elif [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
      export E2E_SUPABASE_SECRET_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
    elif [ -n "${SERVICE_ROLE_KEY:-}" ]; then
      export E2E_SUPABASE_SECRET_KEY="${SERVICE_ROLE_KEY}"
    fi
  fi

  if [ -z "${E2E_SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
    if [ -n "${SERVICE_ROLE_KEY:-}" ]; then
      export E2E_SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY}"
    elif [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
      export E2E_SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
    elif [ -n "${SECRET_KEY:-}" ]; then
      export E2E_SUPABASE_SERVICE_ROLE_KEY="${SECRET_KEY}"
    fi
  fi
}

has_required() {
  [ -n "${E2E_SUPABASE_URL:-}" ] \
    && [ -n "${E2E_SUPABASE_ANON_KEY:-}" ] \
    && { [ -n "${E2E_SUPABASE_SECRET_KEY:-}" ] || [ -n "${E2E_SUPABASE_SERVICE_ROLE_KEY:-}" ]; }
}

validate_required() {
  if [ -z "${E2E_SUPABASE_URL:-}" ]; then
    echo "Missing E2E_SUPABASE_URL (or SUPABASE/VITE/EXPO URL aliases)." >&2
    return 1
  fi

  if [ -z "${E2E_SUPABASE_ANON_KEY:-}" ]; then
    echo "Missing E2E_SUPABASE_ANON_KEY (or SUPABASE/VITE/EXPO anon aliases)." >&2
    return 1
  fi

  if [ -z "${E2E_SUPABASE_SECRET_KEY:-}" ] && [ -z "${E2E_SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
    echo "Missing E2E_SUPABASE_SECRET_KEY or E2E_SUPABASE_SERVICE_ROLE_KEY." >&2
    return 1
  fi
}

print_exports() {
  printf 'export E2E_SUPABASE_URL=%q\n' "${E2E_SUPABASE_URL}"
  printf 'export E2E_SUPABASE_ANON_KEY=%q\n' "${E2E_SUPABASE_ANON_KEY}"

  if [ -n "${E2E_SUPABASE_SECRET_KEY:-}" ]; then
    printf 'export E2E_SUPABASE_SECRET_KEY=%q\n' "${E2E_SUPABASE_SECRET_KEY}"
  fi

  if [ -n "${E2E_SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
    printf 'export E2E_SUPABASE_SERVICE_ROLE_KEY=%q\n' "${E2E_SUPABASE_SERVICE_ROLE_KEY}"
  fi
}

write_env_file() {
  local tmp_file
  tmp_file="$(mktemp "${ROOT_DIR}/.env.local.tmp.XXXXXX")"

  if [ -f "${ENV_FILE}" ]; then
    awk '!/^(E2E_SUPABASE_URL|E2E_SUPABASE_ANON_KEY|E2E_SUPABASE_SECRET_KEY|E2E_SUPABASE_SERVICE_ROLE_KEY)=/' "${ENV_FILE}" > "${tmp_file}"
  fi

  if [ -s "${tmp_file}" ]; then
    printf "\n" >> "${tmp_file}"
  fi

  {
    printf "E2E_SUPABASE_URL=%s\n" "${E2E_SUPABASE_URL}"
    printf "E2E_SUPABASE_ANON_KEY=%s\n" "${E2E_SUPABASE_ANON_KEY}"

    if [ -n "${E2E_SUPABASE_SECRET_KEY:-}" ]; then
      printf "E2E_SUPABASE_SECRET_KEY=%s\n" "${E2E_SUPABASE_SECRET_KEY}"
    fi

    if [ -n "${E2E_SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
      printf "E2E_SUPABASE_SERVICE_ROLE_KEY=%s\n" "${E2E_SUPABASE_SERVICE_ROLE_KEY}"
    fi
  } >> "${tmp_file}"

  mv "${tmp_file}" "${ENV_FILE}"
  echo "Updated ${ENV_FILE} with E2E_SUPABASE_* keys" >&2
}

main() {
  local mode="${1:---print-exports}"
  if [ "${mode}" = "--help" ] || [ "${mode}" = "-h" ]; then
    usage
    exit 0
  fi

  load_from_env_file || true
  map_to_e2e

  if ! has_required; then
    load_from_supabase_status
    map_to_e2e
  fi

  validate_required

  case "${mode}" in
    --print-exports)
      print_exports
      ;;
    --write-file)
      write_env_file
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
