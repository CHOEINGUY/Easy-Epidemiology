// HistoryManager.js
// Undo/Redo 스택을 관리하며 localStorage(epidemiology_history)에 지속성을 부여하는 클래스
// Phase 4 개발 Step-1: 뼈대 구현 (2025-07-02)

const HISTORY_STORAGE_KEY = 'epidemiology_history';
const DEFAULT_MAX_HISTORY = 15;

// 안전한 deep-clone (structuredClone 지원이 없을 때 JSON fallback)
function deepClone(obj) {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}

export class HistoryManager {
  /**
   * @param {number} max 최대 저장 스택 크기
   */
  constructor(max = DEFAULT_MAX_HISTORY) {
    this.MAX = max;
    this.undoStack = [];
    this.redoStack = [];
    this.isRestoring = false; // Undo/Redo 실행 중 여부 (중복 스냅샷 방지)

    this._load();
  }

  /**
   * 현재 상태 스냅샷을 저장합니다.
   * @param {object} currentState headers, rows, settings 포함 객체
   * @param {string} action 스냅샷을 유발한 액션명(선택)
   * @param {object} meta 추가 메타데이터(선택)
   */
  saveSnapshot(currentState, action = 'unknown', meta = {}) {
    if (this.isRestoring) return; // Undo/Redo 중에는 저장하지 않음
    if (!currentState) return;

    const snapshotData = deepClone(currentState);

    // 직전 상태와 비교해 중복이면 패스
    const lastSnapshot = this.undoStack[this.undoStack.length - 1];
    if (lastSnapshot && JSON.stringify(lastSnapshot.data) === JSON.stringify(snapshotData)) {
      return;
    }

    const snapshot = {
      timestamp: Date.now(),
      action,
      data: snapshotData,
      meta,
    };

    this.undoStack.push(snapshot);
    // 새 스냅샷이 생기면 redoStack 은 초기화
    this.redoStack = [];

    // 스택 사이즈 유지
    if (this.undoStack.length > this.MAX) {
      this.undoStack.shift();
    }

    this._persist();
  }

  /**
   * Undo 실행: 이전 스냅샷을 반환하고 현재 스냅샷을 redoStack 에 보관
   * @returns {object|null} headers, rows, settings 객체 또는 null (스택이 없을 때)
   */
  undo() {
    if (this.undoStack.length === 0) return null;

    this.isRestoring = true;

    const snapshot = this.undoStack.pop();
    if (snapshot) {
      this.redoStack.push(snapshot);
      this._persist();
    }

    this.isRestoring = false;
    return snapshot ? deepClone(snapshot.data) : null;
  }

  /**
   * Redo 실행: redoStack 에서 복원
   * @returns {object|null} headers, rows, settings 객체 또는 null
   */
  redo() {
    if (this.redoStack.length === 0) return null;

    this.isRestoring = true;

    const snapshot = this.redoStack.pop();
    if (snapshot) {
      this.undoStack.push(snapshot);
      this._persist();
    }

    this.isRestoring = false;
    return snapshot ? deepClone(snapshot.data) : null;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this._persist();
  }

  /* ====================== */
  /*   LocalStorage helper  */
  /* ====================== */

  _persist() {
    try {
      const payload = {
        version: '1.0',
        lastSaved: Date.now(),
        undoStack: this.undoStack,
        redoStack: this.redoStack,
      };
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.error('[HistoryManager] persist error:', err);
    }
  }

  _load() {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.undoStack)) this.undoStack = parsed.undoStack;
      if (Array.isArray(parsed?.redoStack)) this.redoStack = parsed.redoStack;
    } catch (err) {
      console.warn('[HistoryManager] load failed, resetting history', err);
      this.undoStack = [];
      this.redoStack = [];
    }
  }
}

export default HistoryManager; 