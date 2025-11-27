/**
 * 범용 캐시 유틸리티
 * TTL 기반 캐싱과 파일 수정 시간 기반 무효화를 지원합니다.
 */

export interface CacheOptions {
  /** TTL in milliseconds */
  ttl: number;
  /** Maximum number of entries (LRU eviction) */
  maxSize?: number;
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  mtime?: number;
}

export class Cache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly ttl: number;
  private readonly maxSize: number;

  constructor(options: CacheOptions) {
    this.ttl = options.ttl;
    this.maxSize = options.maxSize ?? 100;
  }

  /**
   * 캐시에서 값 조회
   * TTL 만료 시 undefined 반환
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // TTL 체크
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * 캐시에 값 저장
   * @param key 캐시 키
   * @param value 저장할 값
   * @param mtime 파일 수정 시간 (선택적, 파일 기반 캐시 무효화용)
   */
  set(key: string, value: T, mtime?: number): void {
    // LRU 제거: 최대 크기 초과 시 가장 오래된 항목 제거
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      mtime,
    });
  }

  /**
   * 캐시에 키가 존재하고 유효한지 확인
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * 특정 키 또는 전체 캐시 무효화
   */
  invalidate(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 파일 수정 시간 기반 캐시 유효성 검사
   * 현재 mtime이 캐시된 mtime과 다르면 무효
   */
  isValid(key: string, currentMtime?: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // TTL 체크
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    // mtime 체크 (제공된 경우)
    if (currentMtime !== undefined && entry.mtime !== undefined) {
      if (currentMtime > entry.mtime) {
        this.cache.delete(key);
        return false;
      }
    }

    return true;
  }

  /**
   * 캐시된 항목의 mtime 조회
   */
  getMtime(key: string): number | undefined {
    return this.cache.get(key)?.mtime;
  }

  /**
   * 캐시 크기 반환
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 캐시 초기화
   */
  clear(): void {
    this.cache.clear();
  }
}

/**
 * 캐시 인스턴스 생성 헬퍼 함수
 */
export function createCache<T>(options: CacheOptions): Cache<T> {
  return new Cache<T>(options);
}
