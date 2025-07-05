/**
 * 성능 모니터링 유틸리티
 */

class PerformanceMonitor {
  constructor() {
    this.marks = new Map();
    this.measures = new Map();
  }

  /**
   * 성능 마크 시작
   * @param {string} name - 마크 이름
   */
  startMark(name) {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}-start`);
      this.marks.set(name, Date.now());
    }
  }

  /**
   * 성능 마크 종료 및 측정
   * @param {string} name - 마크 이름
   * @param {string} [measureName] - 측정 이름 (기본값: name)
   * @returns {number} 실행 시간 (ms)
   */
  endMark(name, measureName = name) {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}-end`);
      performance.measure(measureName, `${name}-start`, `${name}-end`);
      
      const startTime = this.marks.get(name);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.measures.set(measureName, duration);
      
      // 개발 환경에서만 로그 출력
      if (import.meta.env?.MODE === 'development' || false) {
        console.log(`⏱️ ${measureName}: ${duration}ms`);
      }
      
      return duration;
    }
    return 0;
  }

  /**
   * 특정 작업의 성능 측정
   * @param {string} name - 작업 이름
   * @param {Function} fn - 측정할 함수
   * @returns {*} 함수 실행 결과
   */
  measure(name, fn) {
    this.startMark(name);
    try {
      const result = fn();
      this.endMark(name);
      return result;
    } catch (error) {
      this.endMark(name);
      throw error;
    }
  }

  /**
   * 비동기 작업의 성능 측정
   * @param {string} name - 작업 이름
   * @param {Function} fn - 측정할 비동기 함수
   * @returns {Promise} 함수 실행 결과
   */
  async measureAsync(name, fn) {
    this.startMark(name);
    try {
      const result = await fn();
      this.endMark(name);
      return result;
    } catch (error) {
      this.endMark(name);
      throw error;
    }
  }

  /**
   * 메모리 사용량 측정 (브라우저 지원 시)
   */
  getMemoryUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
      const memory = performance.memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024 * 100) / 100,
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100
      };
    }
    return null;
  }

  /**
   * 성능 측정 결과 요약
   */
  getSummary() {
    const summary = {
      measures: Object.fromEntries(this.measures),
      memory: this.getMemoryUsage()
    };
    
    if (import.meta.env?.MODE === 'development' || false) {
      console.table(summary.measures);
      if (summary.memory) {
        console.log('💾 Memory Usage:', summary.memory);
      }
    }
    
    return summary;
  }

  /**
   * 모든 측정 데이터 초기화
   */
  clear() {
    this.marks.clear();
    this.measures.clear();
    
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }

  /**
   * 전체 성능 리포트를 생성합니다.
   * @returns {Object} 전체 성능 메트릭
   */
  generateReport() {
    const report = {};
    
    for (const [name, measurements] of this.measures) {
      const totalDuration = measurements.reduce((sum, m) => sum + m, 0);
      const count = measurements.length;
      
      if (count > 0) {
        const durations = measurements.map(m => m);
        const avgDuration = totalDuration / count;
        const minDuration = Math.min(...durations);
        const maxDuration = Math.max(...durations);
        
        report[name] = {
          count,
          avgDuration: Math.round(avgDuration * 100) / 100,
          minDuration: Math.round(minDuration * 100) / 100,
          maxDuration: Math.round(maxDuration * 100) / 100,
          totalDuration: Math.round(totalDuration * 100) / 100
        };
      }
    }
    
    if (import.meta.env?.MODE === 'development' || false) {
      console.table(report);
    }
  }
}

// 전역 성능 모니터 인스턴스
export const performanceMonitor = new PerformanceMonitor();

// 편의 함수들
export const measure = (name, fn) => performanceMonitor.measure(name, fn);
export const measureAsync = (name, fn) => performanceMonitor.measureAsync(name, fn);
export const startMark = (name) => performanceMonitor.startMark(name);
export const endMark = (name, measureName) => performanceMonitor.endMark(name, measureName);

export default performanceMonitor; 