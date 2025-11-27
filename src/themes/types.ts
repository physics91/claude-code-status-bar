/**
 * Powerline 심볼 정의
 */
export interface PowerlineSymbols {
  separator: string;
  separatorThin: string;
  branch: string;
  readonly: string;
  modified: string;
}

/**
 * 세그먼트 색상
 */
export interface SegmentColors {
  bg: string;
  fg: string;
}

/**
 * 테마 색상 정의
 */
export interface ThemeColors {
  segments: {
    model: SegmentColors;
    git: SegmentColors;
    tokens: SegmentColors;
    cost: SegmentColors;
    session: SegmentColors;
    cwd: SegmentColors;
    context: SegmentColors;
    todo: SegmentColors;
    memory: SegmentColors;
    files: SegmentColors;
  };
  status: {
    normal: string;
    warning: string;
    error: string;
    success: string;
  };
  progress: {
    filled: string;
    empty: string;
    warning: string;
    critical: string;
  };
}

/**
 * 테마 정의
 */
export interface Theme {
  id: string;
  name: string;
  symbols: PowerlineSymbols;
  colors: ThemeColors;
}

/**
 * 테마 컨텍스트 값
 */
export interface ThemeContextValue {
  theme: Theme;
  setTheme: (themeId: string) => void;
}
