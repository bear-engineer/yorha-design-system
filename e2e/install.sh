#!/usr/bin/env bash
# T10: build registry, serve it, install every item into a fresh React Router 8.5.1 app,
# verify placed files, build, serve the app, run Playwright.
# GITHUB_REF set -> items are installed via bear-engineer/yorha-design-system/<item>#$GITHUB_REF instead of the local server.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
E2E="$ROOT/e2e"
OUT="$E2E/.out"
FIX="$E2E/.fixture"
APP="$FIX/app"
CREATE_RR="create-react-router@8.5.1"
SHADCN="shadcn@4.23.0"
PIDS=()

mkdir -p "$OUT"
cleanup() { for p in ${PIDS[@]+"${PIDS[@]}"}; do kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT

# step <name> <command...>: run with its own log; fail with the command's own exit code.
step() {
  local name="$1"; shift
  echo "==> $name"
  local rc=0
  "$@" >"$OUT/$name.log" 2>&1 || rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "FAILED: $name (exit $rc), tail of $OUT/$name.log:" >&2
    tail -n 40 "$OUT/$name.log" >&2
    exit "$rc"
  fi
}
free_port() { node -e 'const s=require("net").createServer().listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})'; }

cd "$ROOT"
step registry-build pnpm registry:build

rm -rf "$FIX"; mkdir -p "$FIX"
export CI=1

if [ -n "${GITHUB_REF:-}" ]; then
  MODE=github
else
  MODE=local
  rm -f "$OUT/port"
  node "$E2E/serve.mjs" "$ROOT/public" "$OUT/port" >"$OUT/serve.log" 2>&1 &
  PIDS+=($!)
  for _ in $(seq 1 50); do [ -s "$OUT/port" ] && break; sleep 0.2; done
  [ -s "$OUT/port" ] || { echo "registry server did not start" >&2; cat "$OUT/serve.log" >&2; exit 1; }
  REG_PORT="$(cat "$OUT/port")"
  curl -fsS "http://127.0.0.1:$REG_PORT/r/button.json" -o /dev/null
fi
echo "mode: $MODE"

cd "$FIX"
step create-app pnpm dlx "$CREATE_RR" app --yes --no-git-init --package-manager pnpm --no-agent-skills
[ -f "$APP/package.json" ] || { echo "create-react-router produced no app/package.json" >&2; exit 1; }
cd "$APP"

if [ "$MODE" = local ]; then
  sed "s#https://bear-engineer.github.io/yorha-design-system/r/{name}.json#http://127.0.0.1:$REG_PORT/r/{name}.json#" "$ROOT/templates/components.json" >components.json
  grep -q "127.0.0.1:$REG_PORT" components.json || { echo "components.json registry URL not rewritten" >&2; exit 1; }
  item_ref() { echo "@yorha/$1"; }
else
  # GitHub path: items by GitHub reference; the @yorha namespace is still configured for in-registry dependencies.
  cp "$ROOT/templates/components.json" components.json
  item_ref() { echo "bear-engineer/yorha-design-system/$1#$GITHUB_REF"; }
fi

NON_BLOCK=(); BLOCKS=()
while read -r type name; do
  if [ "$type" = "registry:block" ]; then BLOCKS+=("$name"); else NON_BLOCK+=("$name"); fi
done < <(node -e 'for (const i of JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))) console.log(i.type+" "+i.name)' "$ROOT/registry/items.json")
echo "items: ${#NON_BLOCK[@]} + ${#BLOCKS[@]} block(s)"

add_items() {
  local label="$1"; shift
  local refs=(); for n in "$@"; do refs+=("$(item_ref "$n")"); done
  step "add-$label" pnpm dlx "$SHADCN" add "${refs[@]}" --yes --overwrite </dev/null
}
add_items items "${NON_BLOCK[@]}"
add_items block "${BLOCKS[@]}"

# every placed file must exist (shadcn can exit 0 without writing)
echo "==> verify placed files"
node "$E2E/expected-files.mjs" "$ROOT/public/r" >"$OUT/expected-files.tsv" || { echo "expected-files failed" >&2; exit 1; }
missing=0
: >"$OUT/findings.txt"
while IFS=$'\t' read -r name flat alt; do
  if [ -s "$APP/$flat" ]; then continue
  elif [ -s "$APP/$alt" ]; then echo "item=$name placed at $alt (expected $flat)" >>"$OUT/findings.txt"
  else echo "MISSING: item=$name file=$flat (also not at $alt)" >&2; missing=1
  fi
done <"$OUT/expected-files.tsv"
[ "$missing" -eq 0 ] || { echo "blocked: items did not install files for consumers (see MISSING above)" >&2; exit 1; }
echo "$(wc -l <"$OUT/expected-files.tsv" | tr -d ' ') files present; $(wc -l <"$OUT/findings.txt" | tr -d ' ') placed off the flat path (see $OUT/findings.txt)"

step fixture-setup node "$E2E/fixture-src/fixture-setup.mjs" "$APP" "$E2E/fixture-src/gallery.tsx"
step typegen pnpm exec react-router typegen
step tsc pnpm exec tsc --noEmit
step build pnpm exec react-router build

APP_PORT="$(free_port)"
PORT="$APP_PORT" pnpm exec react-router-serve ./build/server/index.js >"$OUT/app-serve.log" 2>&1 &
PIDS+=($!)
for _ in $(seq 1 60); do curl -fsS "http://127.0.0.1:$APP_PORT/" -o /dev/null 2>/dev/null && break; sleep 0.5; done
curl -fsS "http://127.0.0.1:$APP_PORT/" -o /dev/null || { echo "app server not reachable" >&2; tail -n 30 "$OUT/app-serve.log" >&2; exit 1; }

# light-theme bg token value comes from the built base item (single source of truth)
E2E_LIGHT_BG="$(node -e 'const b=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(b.cssVars.light["yorha-bg"])' "$ROOT/public/r/base.json")"
export E2E_LIGHT_BG
export E2E_APP_URL="http://127.0.0.1:$APP_PORT"
cd "$ROOT"
echo "==> playwright ($E2E_APP_URL, bg $E2E_LIGHT_BG)"
rc=0
pnpm exec playwright test -c e2e/playwright.config.ts >"$OUT/playwright.log" 2>&1 || rc=$?
cat "$OUT/playwright.log"
[ "$rc" -eq 0 ] || { echo "playwright failed (exit $rc)" >&2; exit "$rc"; }
echo "e2e ok ($MODE)"
