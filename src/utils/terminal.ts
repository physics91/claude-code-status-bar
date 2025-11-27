/**
 * 터미널 너비 가져오기
 */
export function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

/**
 * 터미널 높이 가져오기
 */
export function getTerminalHeight(): number {
  return process.stdout.rows || 24;
}

/**
 * 256색 지원 여부 확인
 */
export function supports256Colors(): boolean {
  const term = process.env.TERM || '';
  const colorterm = process.env.COLORTERM || '';

  return (
    term.includes('256color') ||
    colorterm === 'truecolor' ||
    colorterm === '24bit'
  );
}

/**
 * 트루컬러 지원 여부 확인
 */
export function supportsTrueColor(): boolean {
  const colorterm = process.env.COLORTERM || '';
  return colorterm === 'truecolor' || colorterm === '24bit';
}

/**
 * Nerd Fonts 지원 가능성 확인 (휴리스틱)
 */
export function mayHaveNerdFonts(): boolean {
  // 환경 변수로 명시적 설정 확인
  if (process.env.NERD_FONTS === '1') return true;
  if (process.env.NERD_FONTS === '0') return false;

  // 터미널 애플리케이션 추측
  const termProgram = process.env.TERM_PROGRAM || '';
  const nerdFontTerminals = [
    'iTerm.app',
    'Hyper',
    'Alacritty',
    'kitty',
    'WezTerm',
    'Windows Terminal',
  ];

  return nerdFontTerminals.some((t) =>
    termProgram.toLowerCase().includes(t.toLowerCase())
  );
}

/**
 * ANSI 이스케이프 시퀀스 제거
 */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * 실제 표시 너비 계산 (ANSI 제외)
 */
export function getDisplayWidth(text: string): number {
  const stripped = stripAnsi(text);
  // 한글 등 와이드 문자 처리 (간단한 버전)
  let width = 0;
  for (const char of stripped) {
    const code = char.charCodeAt(0);
    // CJK 문자 범위 (대략적)
    if (
      (code >= 0x1100 && code <= 0x11ff) || // 한글 자모
      (code >= 0x3000 && code <= 0x9fff) || // CJK
      (code >= 0xac00 && code <= 0xd7a3) || // 한글 음절
      (code >= 0xf900 && code <= 0xfaff) || // CJK 호환
      (code >= 0xff00 && code <= 0xffef) // 전각
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}
