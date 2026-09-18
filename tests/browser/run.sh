#!/usr/bin/env bash
# Runs the browser suite against a local copy of the game.
#
#   bash tests/browser/run.sh            # every test
#   bash tests/browser/run.sh t-qol      # only tests whose name contains "t-qol"
#
# Needs node, playwright-core (npm install) and a Chromium it can find (see
# lib.js: /opt/pw-browsers, PLAYWRIGHT_BROWSERS_PATH, or the Playwright cache
# after `npx playwright-core install chromium`).
#
# Two static servers are started from the repository root on ports 8123 and
# 8124 (the second gives the PWA tests their own origin) unless something is
# already listening there. Screenshots go to tests/out/.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
FILTER="${1:-}"
cd "$HERE"
mkdir -p ../out

# dist/ is gitignored and regenerated, not committed, so t-bundle needs it
# built here rather than assuming a prior local run left one lying around.
(cd "$ROOT" && node tools/bundle.js) || exit 1

pids=()
for port in 8123 8124; do
  if ! (exec 3<>/dev/tcp/127.0.0.1/$port) 2>/dev/null; then
    (cd "$ROOT" && exec python3 -m http.server $port >/dev/null 2>&1) &
    pids+=($!)
  fi
done
sleep 1

# Screenshot-only and hour-long scripts are not part of the pass/fail suite.
SKIP="t-full|t-jobsheet|t-sheet|t-teamsheet|t-teamshot|t-shots|t-deployshot|t-pace-base"
pass=0; fail=0; failed=()
for f in t-*.js; do
  n="${f%.js}"
  if [[ "$n" =~ ^($SKIP) ]]; then continue; fi
  if [[ -n "$FILTER" && "$n" != *"$FILTER"* ]]; then continue; fi
  if timeout 600 node "$f" > "../out/$n.log" 2>&1; then
    printf "%-18s PASS\n" "$n"; pass=$((pass + 1))
  else
    printf "%-18s FAIL\n" "$n"; tail -6 "../out/$n.log" | sed 's/^/    /'; fail=$((fail + 1)); failed+=("$n")
  fi
done

echo "----"
echo "browser suite: $pass passed, $fail failed"
if ((fail)); then echo "failed: ${failed[*]}"; fi

for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null; done
wait 2>/dev/null
((fail == 0))
