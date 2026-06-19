#!/usr/bin/env bash
#
# update-env.sh — set/inspect environment variables in the ClaimGuard EC2 .env
# and restart the API, without ever printing secret values in the clear.
#
# Values are base64-encoded locally and decoded on the server, so any characters
# (slashes, &, spaces, =) are handled safely. The remote .env is rewritten
# key-by-key (existing key replaced, new key appended) and the service restarted.
#
# Usage:
#   ./update-env.sh KEY=VALUE [KEY2=VALUE2 ...]   # set one or more vars
#   ./update-env.sh --secret KEY                  # prompt for VALUE (hidden input)
#   ./update-env.sh --list                        # list keys (values masked)
#   ./update-env.sh --get KEY                      # print one value
#   ./update-env.sh --no-restart KEY=VALUE         # update but don't restart
#   ./update-env.sh --restart                      # just restart the service
#
# Connection settings (override via environment variables):
#   CLAIMGUARD_HOST       (default 13.63.216.27)
#   CLAIMGUARD_SSH_USER   (default ec2-user)
#   CLAIMGUARD_SSH_KEY    (default ~/.ssh/claimguard-ec2.pem)
#   CLAIMGUARD_ENV_PATH   (default /home/ec2-user/claimguard/.env)
#   CLAIMGUARD_SERVICE    (default claimguard)
#
set -euo pipefail

HOST="${CLAIMGUARD_HOST:-13.63.216.27}"
SSH_USER="${CLAIMGUARD_SSH_USER:-ec2-user}"
SSH_KEY="${CLAIMGUARD_SSH_KEY:-$HOME/.ssh/claimguard-ec2.pem}"
ENV_PATH="${CLAIMGUARD_ENV_PATH:-/home/ec2-user/claimguard/.env}"
SERVICE="${CLAIMGUARD_SERVICE:-claimguard}"

SSH=(ssh -o StrictHostKeyChecking=accept-new -o LogLevel=ERROR -i "$SSH_KEY" "$SSH_USER@$HOST")

usage() { sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'; }

restart_service() {
  echo "Restarting $SERVICE ..."
  "${SSH[@]}" "sudo systemctl restart '$SERVICE' && sleep 2 && systemctl is-active '$SERVICE'"
}

list_keys() {
  # Print KEY = [N chars] — never reveals the value.
  "${SSH[@]}" "awk -F= 'NF && \$1 !~ /^#/ {v=substr(\$0, index(\$0,\"=\")+1); printf \"%-22s [%d chars]\n\", \$1, length(v)}' '$ENV_PATH'"
}

get_key() {
  local key="$1"
  "${SSH[@]}" "grep -m1 '^${key}=' '$ENV_PATH' | cut -d= -f2- || echo '(not set)'"
}

# Remote updater: reads "KEY base64(VALUE)" lines on stdin, merges into ENV_PATH.
remote_update() {
  local script
  script='set -e; ENV="'"$ENV_PATH"'";
    while read -r k b; do
      [ -z "$k" ] && continue;
      v=$(printf %s "$b" | base64 -d);
      tmp=$(mktemp);
      grep -v "^${k}=" "$ENV" 2>/dev/null > "$tmp" || true;
      printf "%s=%s\n" "$k" "$v" >> "$tmp";
      chmod 600 "$tmp";
      mv "$tmp" "$ENV";
      echo "set $k";
    done'
  "${SSH[@]}" "$script"
}

# --- parse args ---
RESTART=1
RESTART_ONLY=0
declare -a PAIRS=()

if [ $# -eq 0 ]; then usage; exit 0; fi

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help)   usage; exit 0 ;;
    --no-restart) RESTART=0; shift ;;
    --restart)   RESTART_ONLY=1; shift ;;
    --list)      list_keys; exit 0 ;;
    --get)       shift; [ $# -ge 1 ] || { echo "--get needs a KEY" >&2; exit 1; }; get_key "$1"; exit 0 ;;
    --secret)
      shift; [ $# -ge 1 ] || { echo "--secret needs a KEY" >&2; exit 1; }
      key="$1"
      printf "Value for %s (hidden): " "$key" >&2
      read -rs val; echo >&2
      PAIRS+=("$key=$val"); shift ;;
    *=*)         PAIRS+=("$1"); shift ;;
    *)           echo "unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

if [ "$RESTART_ONLY" -eq 1 ]; then
  restart_service
  exit 0
fi

if [ "${#PAIRS[@]}" -eq 0 ]; then
  echo "Nothing to update. Pass KEY=VALUE pairs (or --help)." >&2
  exit 1
fi

# Encode each value to base64 and stream "KEY b64" lines to the server.
payload=""
for pair in "${PAIRS[@]}"; do
  k="${pair%%=*}"
  v="${pair#*=}"
  b=$(printf %s "$v" | base64 | tr -d '\r\n')
  payload+="$k $b"$'\n'
done

printf '%s' "$payload" | remote_update

if [ "$RESTART" -eq 1 ]; then
  restart_service
else
  echo "(skipped restart; run '$0 --restart' to apply)"
fi
