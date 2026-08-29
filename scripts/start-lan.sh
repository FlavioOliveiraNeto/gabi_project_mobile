# Sobe o Metro para testar em aparelho físico (iPhone via Expo Go).
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
[[ -x "$DIR/wsl-browser.sh" ]] && export BROWSER="$DIR/wsl-browser.sh"

exec npx expo start "$@"
