#!/usr/bin/env bash
set -euo pipefail

command -v jq &>/dev/null || { echo "jq 필요"; exit 0; }

CACHE_DIR="$HOME/.claude/statusline-cache"
GIT_CACHE=""  # set after JSON parse
mkdir -p "$CACHE_DIR"

# ANSI colors ($'...' ensures actual ESC bytes, not literal \033 text)
RST=$'\033[0m' BOLD=$'\033[1m' DIM=$'\033[2m'
CYAN=$'\033[36m' GREEN=$'\033[32m' YEL=$'\033[33m' RED=$'\033[31m' MAG=$'\033[35m'
LBLUE=$'\033[94m' LGRAY=$'\033[37m' LORANGE=$'\033[38;5;215m'

# Parse stdin JSON (single jq call)
input=$(cat)
parsed=$(echo "$input" | jq -r '
  "MODEL=\(.model.display_name // "?" | @sh)",
  "PCT=\(.context_window.used_percentage // 0)",
  "CWD=\(.cwd // "." | @sh)",
  "PROJDIR=\(.workspace.project_dir // .cwd // "." | @sh)",
  "TRANSCRIPT=\(.transcript_path // "" | @sh)",
  "U5H=\(.rate_limits.five_hour.used_percentage // "?" | @sh)",
  "U7D=\(.rate_limits.seven_day.used_percentage // "?" | @sh)",
  "R5H=\(.rate_limits.five_hour.resets_at // "" | @sh)",
  "R7D=\(.rate_limits.seven_day.resets_at // "" | @sh)"
' 2>/dev/null) || { echo "?"; exit 0; }
eval "$parsed"

GIT_CACHE="$CACHE_DIR/git_$(echo "$CWD" | md5sum | cut -c1-8)"

# Effort level detection (priority: env var > transcript > settings.json > default)
# CLAUDE_CODE_EFFORT_LEVEL overrides everything (same as Claude Code internal logic)
EFFORT=""
_env_effort="${CLAUDE_CODE_EFFORT_LEVEL:-}"
_env_lower="${_env_effort,,}"
if [[ "$_env_lower" == "unset" || "$_env_lower" == "auto" ]]; then
  EFFORT="auto"
elif [[ "$_env_lower" =~ ^(low|medium|high|max)$ ]]; then
  EFFORT="$_env_lower"
fi
# Transcript (scoped to <local-command-stdout> to avoid false positives from embedded code)
# Format 1: "Set effort level to {effort} ..." (/effort X)
# Format 2: "Current effort level: {effort} ..." (/effort without args, explicit level set)
# Format 3: "Set model to ... with {effort} effort" (/model X with effort)
# Format 4: "Effort level set to auto" or "Effort level: auto ..." (/effort auto or auto state)
if [[ -z "$EFFORT" && -n "$TRANSCRIPT" && -f "$TRANSCRIPT" ]]; then
  local_match=$(tac "$TRANSCRIPT" 2>/dev/null | \
    grep -m1 '<local-command-stdout>Set effort level to\|<local-command-stdout>Current effort level:\|<local-command-stdout>Effort level.*auto\|<local-command-stdout>Set model to.*with.*effort' || true)
  if [[ -n "$local_match" ]]; then
    if echo "$local_match" | grep -q 'Effort level.*auto\|Effort level set to auto'; then
      EFFORT="auto"
    else
      EFFORT=$(echo "$local_match" | sed -n 's/.*Set effort level to \(low\|medium\|high\|max\).*/\1/p' 2>/dev/null || true)
      [[ -z "$EFFORT" ]] && EFFORT=$(echo "$local_match" | sed -n 's/.*Current effort level: \(low\|medium\|high\|max\).*/\1/p' 2>/dev/null || true)
      [[ -z "$EFFORT" ]] && EFFORT=$(echo "$local_match" | sed -n 's/.*with \(low\|medium\|high\|max\) effort.*/\1/p' 2>/dev/null || true)
    fi
  fi
fi
# Fallback: settings.json (only low/medium/high persist; max is always session-only)
if [[ -z "$EFFORT" ]]; then
  EFFORT=$(jq -r '.effortLevel // empty' "$HOME/.claude/settings.json" 2>/dev/null || true)
fi
[[ -z "$EFFORT" ]] && EFFORT="auto"

PCT=${PCT%.*}
PCT=${PCT:-0}
U5H=${U5H%.*}
U7D=${U7D%.*}

# rate_limits 캐시: 세션 시작 직후 필드가 없을 때 이전 값으로 폴백
RATE_CACHE="$CACHE_DIR/rate_limits"
if [[ "$U5H" != "?" ]]; then
  printf '%s\n%s\n%s\n%s\n' "$U5H" "$U7D" "$R5H" "$R7D" > "$RATE_CACHE"
elif [[ -f "$RATE_CACHE" ]]; then
  U5H=$(sed -n '1p' "$RATE_CACHE") U7D=$(sed -n '2p' "$RATE_CACHE")
  R5H=$(sed -n '3p' "$RATE_CACHE") R7D=$(sed -n '4p' "$RATE_CACHE")
fi

# Context color & progress bar
if (( PCT < 50 )); then CC=$GREEN
elif (( PCT < 80 )); then CC=$YEL
else CC=$RED; fi

BAR=""
for ((i=0; i<10; i++)); do
  (( i * 10 < PCT )) && BAR+="█" || BAR+="░"
done

# Git info (5s cache: branch, diff, unpushed, worktrees - parallel fetch)
NOW=$(date +%s)
BRANCH="" GADD="0" GDEL="0" UNPUSHED="0" WORKTREES="0" IN_WT=""
GIT_OK=false

read_git_cache() {
  BRANCH=$(sed -n '2p' "$GIT_CACHE" 2>/dev/null || true)
  GADD=$(sed -n '3p' "$GIT_CACHE" 2>/dev/null || echo 0)
  GDEL=$(sed -n '4p' "$GIT_CACHE" 2>/dev/null || echo 0)
  UNPUSHED=$(sed -n '5p' "$GIT_CACHE" 2>/dev/null || echo 0)
  WORKTREES=$(sed -n '6p' "$GIT_CACHE" 2>/dev/null || echo 0)
  IN_WT=$(sed -n '7p' "$GIT_CACHE" 2>/dev/null || true)
}

if [[ -f "$GIT_CACHE" ]]; then
  CT=$(head -1 "$GIT_CACHE" 2>/dev/null || echo 0)
  if (( NOW - CT < 5 )); then
    read_git_cache
    GIT_OK=true
  fi
fi

if ! $GIT_OK && git -C "$CWD" rev-parse --git-dir &>/dev/null; then
  TMP="$CACHE_DIR/git_tmp"
  # Parallel fetch
  git -C "$CWD" rev-parse --abbrev-ref HEAD > "${TMP}_branch" 2>/dev/null &
  git -C "$CWD" diff HEAD --shortstat > "${TMP}_diff" 2>/dev/null &
  { git -C "$CWD" rev-list --count @{u}..HEAD 2>/dev/null || echo 0; } > "${TMP}_unpushed" &
  git -C "$CWD" worktree list > "${TMP}_wt" 2>/dev/null &
  wait

  WT_BRANCH=$(cat "${TMP}_branch" 2>/dev/null || echo "-")
  # Detached HEAD: show short SHA instead of "HEAD"
  if [[ "$WT_BRANCH" == "HEAD" ]]; then
    WT_BRANCH=$(git -C "$CWD" rev-parse --short HEAD 2>/dev/null || echo "detached")
  fi
  GADD=$(sed -n 's/.* \([0-9]*\) insertion.*/\1/p' "${TMP}_diff" 2>/dev/null || echo 0)
  GDEL=$(sed -n 's/.* \([0-9]*\) deletion.*/\1/p' "${TMP}_diff" 2>/dev/null || echo 0)
  UNPUSHED=$(cat "${TMP}_unpushed" 2>/dev/null || echo 0)
  WORKTREES=$(wc -l < "${TMP}_wt" 2>/dev/null || echo 0)
  WORKTREES=$((WORKTREES - 1))  # exclude main worktree

  GADD=${GADD:-0}; GDEL=${GDEL:-0}; UNPUSHED=${UNPUSHED:-0}
  (( WORKTREES < 0 )) && WORKTREES=0
  # Detect if current session is inside a linked worktree
  local_gitdir=$(git -C "$CWD" rev-parse --git-dir 2>/dev/null || true)
  common_gitdir=$(git -C "$CWD" rev-parse --git-common-dir 2>/dev/null || true)
  IN_WT=""
  if [[ -n "$local_gitdir" && -n "$common_gitdir" && "$local_gitdir" != "$common_gitdir" ]]; then
    IN_WT=$(basename "$local_gitdir")
    # Show main worktree's branch instead of worktree branch
    MAIN_WT_DIR=$(sed -n '1s/ .*//p' "${TMP}_wt" 2>/dev/null || true)
    if [[ -n "$MAIN_WT_DIR" ]]; then
      BRANCH=$(git -C "$MAIN_WT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "$WT_BRANCH")
    else
      BRANCH="$WT_BRANCH"
    fi
  else
    BRANCH="$WT_BRANCH"
  fi
  printf '%s\n%s\n%s\n%s\n%s\n%s\n%s\n' "$NOW" "$BRANCH" "$GADD" "$GDEL" "$UNPUSHED" "$WORKTREES" "$IN_WT" > "$GIT_CACHE"
  rm -f "${TMP}_branch" "${TMP}_diff" "${TMP}_unpushed" "${TMP}_wt"
fi

[[ -z "$BRANCH" ]] && BRANCH="-"

# Format reset as date/time with Korean day-of-week
format_reset_datetime() {
  local ts="$1"
  [[ -z "$ts" ]] && return
  local dow dow_kr dt tm
  dow=$(date -d @"$ts" +%u 2>/dev/null) || return
  case "$dow" in
    1) dow_kr="월";; 2) dow_kr="화";; 3) dow_kr="수";; 4) dow_kr="목";;
    5) dow_kr="금";; 6) dow_kr="토";; 7) dow_kr="일";; *) dow_kr="";;
  esac
  dt=$(date -d @"$ts" +"%m/%d" 2>/dev/null) || return
  tm=$(date -d @"$ts" +"%H:%M" 2>/dev/null) || return
  [[ -n "$dow_kr" ]] && dt+="(${dow_kr})"
  echo "${dt} ${tm}"
}
R5_FMT=$(format_reset_datetime "$R5H")
R7_FMT=$(format_reset_datetime "$R7D")
# Spectrum color: 0%=green → 50%=yellow → 100%=red (256-color safe)
spectrum_color() {
  local pct=${1:-0}
  [[ "$pct" == "?" ]] && { echo "$DIM"; return; }
  (( pct > 100 )) && pct=100
  (( pct < 0 )) && pct=0
  # 256색 호환: green(46) → yellow(226) → red(196)
  if (( pct <= 25 )); then
    printf '\033[38;5;46m'   # green
  elif (( pct <= 50 )); then
    printf '\033[38;5;226m'  # yellow
  elif (( pct <= 75 )); then
    printf '\033[38;5;208m'  # orange
  else
    printf '\033[38;5;196m'  # red
  fi
}
SC5=$(spectrum_color "$U5H")
SC7=$(spectrum_color "$U7D")
# Reset colors: 리셋이 가까울수록 초록 (남은 시간 비율 기준)
calc_reset_pct() {
  local ts="$1" window_sec="$2"
  [[ -z "$ts" ]] && { echo "?"; return; }
  local remaining=$(( ts - NOW ))
  (( remaining < 0 )) && remaining=0
  # 남은 시간 비율: 0%(곧 리셋=초록) ~ 100%(한참 남음=빨강)
  echo $(( remaining * 100 / window_sec ))
}
R5_PCT=$(calc_reset_pct "$R5H" 18000)   # 5h = 18000초
R7_PCT=$(calc_reset_pct "$R7D" 604800)   # 7d = 604800초
RC5=$(spectrum_color "$R5_PCT")
RC7=$(spectrum_color "$R7_PCT")
R5_LABEL=""
R7_LABEL=""
[[ -n "$R5_FMT" ]] && R5_LABEL="(${RC5}~${R5_FMT}${RST})"
[[ -n "$R7_FMT" ]] && R7_LABEL="(${RC7}~${R7_FMT}${RST})"


# Base directory (last component of cwd)
DIRNAME="${PROJDIR##*/}"
WT_LABEL=""
[[ -n "$IN_WT" ]] && WT_LABEL=" ${DIM}⤷wt:${IN_WT}${RST}"

# Last user query from transcript (cached to survive compact)
QUERY_CACHE="$CACHE_DIR/last_query_$(echo "$TRANSCRIPT" | md5sum | cut -c1-8)"
Q=""
if [[ -n "$TRANSCRIPT" && -f "$TRANSCRIPT" ]]; then
  Q=$(tail -500 "$TRANSCRIPT" 2>/dev/null | \
    grep '"type":"user"' | \
    grep -v '"isMeta":true' | \
    grep -v 'tool_result' | \
    jq -r '
      (.message.content // .content) |
      if type == "string" then .
      elif type == "array" then
        [.[] | select(.type == "text") | .text] | join(" ")
      else empty end' 2>/dev/null | \
    grep -v '^$' | \
    grep -vE '^\s*<' | \
    grep -v '^▣' | \
    grep -v '^\[' | \
    grep -v '^→ ' | \
    grep -v '^Loading skill:' | \
    grep -v '^This session is being continued' | \
    tail -1 | \
    tr '\n\r' '  ' | \
    head -c 40 || true)
fi
if [[ -n "$Q" && "$Q" != "-" ]]; then
  echo "$Q" > "$QUERY_CACHE"
elif [[ -f "$QUERY_CACHE" ]]; then
  Q=$(cat "$QUERY_CACHE" 2>/dev/null || true)
fi
[[ -z "$Q" ]] && Q="-"

# Render
# Git stats string
GIT_STATS="${LORANGE}🌿 ${BRANCH}${RST}"
(( GADD > 0 || GDEL > 0 )) && GIT_STATS+=" ${GREEN}+${GADD}${RST} ${RED}-${GDEL}${RST}"
(( UNPUSHED > 0 )) && GIT_STATS+=" ${YEL}↑${UNPUSHED}${RST}"
(( WORKTREES > 0 )) && GIT_STATS+=" ${DIM}🌳${WORKTREES}${RST}"

# 3-line layout (pipe context: terminal width unreliable)
# Line 1: model │ context │ git
# Line 2: directory │ usage │ reset countdown
# Line 3: last query
# Effort display with color
case "$EFFORT" in
  auto) EFFORT_CLR="${CYAN}⚡A${RST}";;
  low)  EFFORT_CLR="${GREEN}⚡L${RST}";;
  medium) EFFORT_CLR="${YEL}⚡M${RST}";;
  high) EFFORT_CLR="${LORANGE}⚡H${RST}";;
  max)  EFFORT_CLR="${RED}⚡MAX${RST}";;
  *)    EFFORT_CLR="${DIM}⚡?${RST}";;
esac
printf "${CYAN}%s${RST} ${EFFORT_CLR} │ ${CC}%s %d%%${RST} │ ${GIT_STATS}${WT_LABEL}\n" \
  "$MODEL" "$BAR" "$PCT"
printf "${LBLUE}📂 %s${RST} │ ${SC5}5h:%s%%${RST}%s ${SC7}wk:%s%%${RST}%s\n" \
  "$DIRNAME" "$U5H" "$R5_LABEL" "$U7D" "$R7_LABEL"
printf "${LGRAY}▸ %s${RST}\n" "$Q"
