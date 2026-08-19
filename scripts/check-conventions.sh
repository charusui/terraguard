#!/usr/bin/env bash
# Mechanical checks for the TerraGuard conventions in CONTRIBUTING.md.
# Catches what a script can catch: branch/commit naming, file naming, and
# secrets that should never reach a commit. Judgment calls (feature-folder
# placement, hooks vs components, empty states) still need a human read.
#
# Usage: bash scripts/check-conventions.sh
# Exits 0 when clean, 1 when something needs fixing.

set -u

cd "$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "not inside a git repository"; exit 1;
}

fails=0
warns=0

fail() { echo "  FAIL  $1"; fails=$((fails + 1)); }
warn() { echo "  WARN  $1"; warns=$((warns + 1)); }
pass() { echo "  ok    $1"; }

section() { echo; echo "$1"; }

# ---------------------------------------------------------------- branch name
section "Branch"
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  fail "you are on '$branch' — work belongs on a branch: git checkout -b feature/<name>"
elif echo "$branch" | grep -Eq '^(feature|fix|chore)/[a-z0-9._/-]+$'; then
  pass "$branch"
else
  fail "'$branch' should start with feature/, fix/, or chore/ and be lowercase-hyphenated"
fi

# ------------------------------------------------------------ commit messages
section "Commit messages on this branch"
prefixes='add|fix|update|refactor|delete|docs|test|chore|config'
range=""
if git rev-parse --verify -q main >/dev/null; then
  range="main..HEAD"
elif git rev-parse --verify -q master >/dev/null; then
  range="master..HEAD"
fi

if [ -n "$range" ]; then
  subjects="$(git log --format=%s "$range" 2>/dev/null)"
else
  subjects="$(git log -5 --format=%s 2>/dev/null)"
fi

if [ -z "$subjects" ]; then
  pass "no commits to check"
else
  bad=0
  while IFS= read -r subject; do
    [ -z "$subject" ] && continue
    if ! echo "$subject" | grep -Eq "^($prefixes): .+"; then
      fail "\"$subject\" — needs a prefix, e.g. \"add: $subject\""
      bad=$((bad + 1))
    fi
  done <<< "$subjects"
  [ "$bad" -eq 0 ] && pass "all prefixed correctly"
fi

# -------------------------------------------------------------------- secrets
section "Secrets"
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  fail ".env is tracked by git — untrack it and rotate anything it contained"
else
  pass ".env is not tracked"
fi

if grep -qE '^\s*\.env\s*$' .gitignore 2>/dev/null; then
  pass ".env is in .gitignore"
else
  fail ".env is missing from .gitignore"
fi

# ------------------------------------------------- files changed on this branch
changed="$( {
  [ -n "$range" ] && git diff --name-only "$range"
  git diff --name-only HEAD
  git diff --name-only --cached
  git ls-files --others --exclude-standard
} 2>/dev/null | sort -u | grep -vE '(^|/)(node_modules|\.next|out|__pycache__|\.netlify|\.vercel)/' )"

section "Changed files"
count="$(echo "$changed" | grep -c . )"
if [ -z "$changed" ]; then
  pass "nothing changed"
elif [ "$count" -gt 20 ]; then
  # A big restructure would otherwise bury the actual findings below it.
  echo "$changed" | head -20 | sed 's/^/  ~     /'
  echo "        ... and $((count - 20)) more ($count files total)"
else
  echo "$changed" | sed 's/^/  ~     /'
fi

# ---------------------------------------------------------------- file naming
section "File naming"
naming_bad=0
nextjs_special='^(page|layout|template|loading|error|not-found|global-error|default|route|middleware|instrumentation|sitemap|robots|opengraph-image|icon|apple-icon|manifest)\.[jt]sx?$'

for f in $changed; do
  [ -f "$f" ] || continue
  base="$(basename "$f")"
  case "$f" in
    *.py)
      if ! echo "$base" | grep -Eq '^[a-z_][a-z0-9_]*\.py$'; then
        fail "$f — Python modules are snake_case"
        naming_bad=$((naming_bad + 1))
      fi
      ;;
    frontend/src/*.tsx|frontend/src/*.ts)
      if echo "$base" | grep -Eq "$nextjs_special"; then
        continue
      fi
      case "$base" in
        use*)
          echo "$base" | grep -Eq '^use[A-Z][A-Za-z0-9]*\.tsx?$' || {
            fail "$f — hooks are camelCase starting with 'use', e.g. useAnalysisData.ts"
            naming_bad=$((naming_bad + 1)); }
          ;;
        *)
          if echo "$f" | grep -q '/components/'; then
            echo "$base" | grep -Eq '^[A-Z][A-Za-z0-9]*\.tsx$' || {
              fail "$f — components are PascalCase .tsx, e.g. SingleLookup.tsx"
              naming_bad=$((naming_bad + 1)); }
          else
            echo "$base" | grep -Eq '^[a-z][A-Za-z0-9]*\.tsx?$' || {
              fail "$f — utilities are camelCase, e.g. mockData.ts"
              naming_bad=$((naming_bad + 1)); }
          fi
          ;;
      esac
      ;;
  esac
done
[ "$naming_bad" -eq 0 ] && pass "names match the conventions"

# ------------------------------------------------------- hardcoded credentials
section "Hardcoded credentials in changed files"
cred_hits=0
for f in $changed; do
  [ -f "$f" ] || continue
  case "$f" in
    *.py|*.ts|*.tsx|*.js|*.jsx|*.mjs|*.json|*.yml|*.yaml|*.toml) ;;
    *) continue ;;
  esac
  hits="$(grep -nEi '(api[_-]?key|secret|token|password|private[_-]?key)["'"'"']?\s*[:=]\s*["'"'"'][A-Za-z0-9_./+-]{16,}["'"'"']|-----BEGIN [A-Z ]*PRIVATE KEY' "$f" 2>/dev/null | head -3)"
  if [ -n "$hits" ]; then
    echo "$hits" | sed "s|^|  FAIL  $f:|"
    fails=$((fails + 1))
    cred_hits=$((cred_hits + 1))
  fi
done
if [ "$cred_hits" -eq 0 ]; then
  pass "no literal keys found"
else
  echo "        move these into environment variables (NEXT_PUBLIC_*, GEE_SERVICE_ACCOUNT_KEY, ...)"
fi

# ---------------------------------------------------------------------- result
section "Result"
if [ "$fails" -eq 0 ]; then
  echo "  $fails failed, $warns warnings — mechanical checks clean."
  echo "  Still check by hand: feature-folder placement, fetching moved into hooks,"
  echo "  booleans named is/has/should, empty states with an indicator message."
  exit 0
else
  echo "  $fails failed, $warns warnings — see above."
  exit 1
fi
