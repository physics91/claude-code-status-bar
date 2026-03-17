# Claude Code Status Bar

Claude Code CLI용 3줄 상태바. bash 스크립트 하나로 동작합니다.

## 표시 정보

```
Opus 4.6 ⚡M │ ████░░░░░░ 38% │ 🌿 main +12 -3 ↑2 🌳1
📂 my-project │ 5h:24% wk:8% ⏳ 5h:03/17(화) 14:30 wk:03/23(일) 09:00
▸ 마지막 사용자 입력...
```

- **1줄**: 모델 / effort / 컨텍스트 사용률 / git 상태 (브랜치, 변경, 미푸시 커밋, 워크트리)
- **2줄**: 디렉토리 / API 사용량 (5시간/주간) / 리셋 시각
- **3줄**: 마지막 사용자 쿼리

## 요구사항

- `bash`, `jq`, `curl`, `git`

## 설치

```bash
git clone https://github.com/physics91/claude-code-status-bar.git
cd claude-code-status-bar
./install.sh
```

또는 수동으로:

```bash
cp statusline.sh ~/.claude/statusline.sh
chmod +x ~/.claude/statusline.sh
```

`~/.claude/settings.json`에 추가:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh"
  }
}
```

## License

MIT
