#!/usr/bin/env bash
set -euo pipefail

command -v jq &>/dev/null || { echo "jq 필요"; exit 0; }

CACHE_DIR="$HOME/.claude/statusline-cache"
USAGE_CACHE="$CACHE_DIR/usage"
GIT_CACHE=""  # set after JSON parse
CREDS="$HOME/.claude/.credentials.json"
USAGE_TTL=60
mkdir -p "$CACHE_DIR"

# ANSI colors
RST='\033[0m' BOLD='\033[1m' DIM='\033[2m'
CYAN='\033[36m' GREEN='\033[32m' YEL='\033[33m' RED='\033[31m' MAG='\033[35m'
LBLUE='\033[94m' LGRAY='\033[37m' LORANGE='\033[38;5;215m'

# Parse stdin JSON (single jq call)
input=$(cat)
parsed=$(echo "$input" | jq -r '
  "MODEL=\(.model.display_name // "?" | @sh)",
  "PCT=\(.context_window.used_percentage // 0)",
  "CWD=\(.cwd // "." | @sh)",
  "PROJDIR=\(.workspace.project_dir // .cwd // "." | @sh)",
  "TRANSCRIPT=\(.transcript_path // "" | @sh)"
' 2>/dev/null) || { echo "?"; exit 0; }
eval "$parsed"

GIT_CACHE="$CACHE_DIR/git_$(echo "$CWD" | md5sum | cut -c1-8)"

# Effort level from transcript
# Format 1: "Set effort level to {effort} ..."
# Format 2: "Set model to ... with {effort} effort"
EFFORT=""
if [[ -n "$TRANSCRIPT" && -f "$TRANSCRIPT" ]]; then
  local_match=$(tac "$TRANSCRIPT" 2>/dev/null | \
    grep -m1 'Set effort level to\|Set model to.*with.*effort' || true)
  if [[ -n "$local_match" ]]; then
    # Try "Set effort level to X" first (standalone effort change)
    EFFORT=$(echo "$local_match" | sed -n 's/.*Set effort level to \(low\|medium\|high\|max\).*/\1/p' 2>/dev/null || true)
    # Try "with X effort" (model change with effort)
    [[ -z "$EFFORT" ]] && EFFORT=$(echo "$local_match" | sed -n 's/.*with \(low\|medium\|high\|max\) effort.*/\1/p' 2>/dev/null || true)
  fi
fi
# Fallback: check settings.json
if [[ -z "$EFFORT" ]]; then
  EFFORT=$(jq -r '.effortLevel // empty' "$HOME/.claude/settings.json" 2>/dev/null || true)
fi
[[ -z "$EFFORT" ]] && EFFORT="medium"

PCT=${PCT%.*}
PCT=${PCT:-0}

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

# Usage API (60s cache, background fetch to avoid blocking)
# Cache format: timestamp / 5h_util / 7d_util / 5h_resets_at / 7d_resets_at
U5H="?" U7D="?" R5H="" R7D=""
LOCK_FILE="$CACHE_DIR/usage.lock"
fetch_usage_bg() {
  [[ ! -f "$CREDS" ]] && return
  # 고아 lock 파일 방지: 30초 이상 된 lock은 제거
  if [[ -f "$LOCK_FILE" ]]; then
    local lock_age=$(( NOW - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo "$NOW") ))
    (( lock_age > 30 )) && rm -f "$LOCK_FILE" || return
  fi
  (
    touch "$LOCK_FILE"
    trap 'rm -f "$LOCK_FILE"' EXIT
    local token
    token=$(jq -r '.claudeAiOauth.accessToken' "$CREDS" 2>/dev/null) || return
    [[ -z "$token" || "$token" == "null" ]] && return
    local resp
    resp=$(curl -sf --max-time 5 \
      -H "Authorization: Bearer $token" \
      -H "anthropic-beta: oauth-2025-04-20" \
      -H "Content-Type: application/json" \
      "https://api.anthropic.com/api/oauth/usage" 2>/dev/null) || return
    local u5 u7 r5 r7
    u5=$(echo "$resp" | jq -r '.five_hour.utilization // empty' 2>/dev/null) || return
    u7=$(echo "$resp" | jq -r '.seven_day.utilization // empty' 2>/dev/null) || return
    r5=$(echo "$resp" | jq -r '.five_hour.resets_at // empty' 2>/dev/null) || true
    r7=$(echo "$resp" | jq -r '.seven_day.resets_at // empty' 2>/dev/null) || true
    [[ -n "$u5" && -n "$u7" ]] && printf '%s\n%s\n%s\n%s\n%s\n' \
      "$(date +%s)" "${u5%.*}" "${u7%.*}" "$r5" "$r7" > "$USAGE_CACHE"
  ) &>/dev/null &
  disown
}

if [[ -f "$USAGE_CACHE" ]]; then
  CT=$(sed -n '1p' "$USAGE_CACHE" 2>/dev/null || echo 0)
  U5H=$(sed -n '2p' "$USAGE_CACHE" 2>/dev/null || echo "?")
  U7D=$(sed -n '3p' "$USAGE_CACHE" 2>/dev/null || echo "?")
  R5H=$(sed -n '4p' "$USAGE_CACHE" 2>/dev/null || true)
  R7D=$(sed -n '5p' "$USAGE_CACHE" 2>/dev/null || true)
  if (( NOW - CT >= USAGE_TTL )); then
    # 5분 이상 갱신 안 되면 신뢰할 수 없으므로 ?로 표시
    (( NOW - CT >= 300 )) && U5H="?" U7D="?" R5H="" R7D=""
    fetch_usage_bg
  fi
else
  fetch_usage_bg
fi

RESET_LABEL=""
# Format reset as date/time with Korean day-of-week
format_reset_datetime() {
  local iso="$1"
  [[ -z "$iso" ]] && return
  local dow dow_kr dt tm
  dow=$(date -d "$iso" +%u 2>/dev/null) || return
  case "$dow" in
    1) dow_kr="월";; 2) dow_kr="화";; 3) dow_kr="수";; 4) dow_kr="목";;
    5) dow_kr="금";; 6) dow_kr="토";; 7) dow_kr="일";; *) dow_kr="";;
  esac
  dt=$(date -d "$iso" +"%m/%d" 2>/dev/null) || return
  tm=$(date -d "$iso" +"%H:%M" 2>/dev/null) || return
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
  local iso="$1" window_sec="$2"
  [[ -z "$iso" ]] && { echo "?"; return; }
  local reset_epoch
  reset_epoch=$(date -d "$iso" +%s 2>/dev/null) || { echo "?"; return; }
  local remaining=$(( reset_epoch - NOW ))
  (( remaining < 0 )) && remaining=0
  # 남은 시간 비율: 0%(곧 리셋=초록) ~ 100%(한참 남음=빨강)
  echo $(( remaining * 100 / window_sec ))
}
R5_PCT=$(calc_reset_pct "$R5H" 18000)   # 5h = 18000초
R7_PCT=$(calc_reset_pct "$R7D" 604800)   # 7d = 604800초
RC5=$(spectrum_color "$R5_PCT")
RC7=$(spectrum_color "$R7_PCT")
if [[ -n "$R5_FMT" || -n "$R7_FMT" ]]; then
  RESET_PARTS=""
  [[ -n "$R5_FMT" ]] && RESET_PARTS+="${RC5}5h:${R5_FMT}${RST}"
  [[ -n "$R5_FMT" && -n "$R7_FMT" ]] && RESET_PARTS+=" "
  [[ -n "$R7_FMT" ]] && RESET_PARTS+="${RC7}wk:${R7_FMT}${RST}"
  RESET_LABEL=" ⏳ ${RESET_PARTS}"
fi


# Base directory (last component of cwd)
DIRNAME="${PROJDIR##*/}"
WT_LABEL=""

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
    grep -v '^<' | \
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
  low)  EFFORT_CLR="${GREEN}⚡L${RST}";;
  medium) EFFORT_CLR="${YEL}⚡M${RST}";;
  high) EFFORT_CLR="${LORANGE}⚡H${RST}";;
  max)  EFFORT_CLR="${RED}⚡MAX${RST}";;
  *)    EFFORT_CLR="${DIM}⚡?${RST}";;
esac
printf "${CYAN}%s${RST} ${EFFORT_CLR} │ ${CC}%s %d%%${RST} │ ${GIT_STATS}${WT_LABEL}\n" \
  "$MODEL" "$BAR" "$PCT"
printf "${LBLUE}📂 %s${RST} │ ${SC5}5h:%s%%${RST} ${SC7}wk:%s%%${RST}${RESET_LABEL}\n" \
  "$DIRNAME" "$U5H" "$U7D"
printf "${LGRAY}▸ %s${RST}\n" "$Q"
