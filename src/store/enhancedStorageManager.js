import { CellInputState } from './cellInputState.js';
import { getMigrationStatus, executeMigration } from './utils/migration.js';

/**
 * 개선된 저장 매니저 클래스
 * 셀 단위 저장과 디바운싱을 통해 성능을 최적화합니다.
 */
export class EnhancedStorageManager {
  constructor(legacyStore = null) {
    this.cellInputState = new CellInputState();
    this.legacyStore = legacyStore; // 기존 store.js 인스턴스
    this.saveTimeout = null;
    this.SAVE_DELAY = 300; // 셀 이동 후 300ms 디바운싱
    this.pendingSaves = new Map(); // 대기 중인 저장 작업들
    this.isProcessing = false; // 저장 처리 중 여부
    this.isInitialized = false; // 초기화 완료 여부
  }
  
  /**
   * 기존 store.js 인스턴스를 설정합니다.
   * @param {Object} legacyStore - 기존 store.js 인스턴스
   */
  setLegacyStore(legacyStore) {
    this.legacyStore = legacyStore;
    console.log('[EnhancedStorageManager] 기존 store.js 인스턴스가 설정되었습니다.');
  }
  
  /**
   * 셀 편집을 시작합니다.
   * @param {Object} cellInfo - 셀 정보 { rowIndex, colIndex, dataKey, cellIndex }
   * @param {*} originalValue - 편집 시작 전 원래 값
   * @param {Object} columnMeta - 컬럼 메타 정보
   */
  startCellEdit(cellInfo, originalValue, columnMeta) {
    this.cellInputState.startEditing(cellInfo, originalValue, columnMeta);
    
    // 기존 대기 중인 저장 작업이 있다면 처리
    this.processPendingSaves();
  }
  
  /**
   * 편집 중 임시 값을 업데이트합니다.
   * @param {*} value - 새로운 임시 값
   */
  updateTempValue(value) {
    this.cellInputState.updateTempValue(value);
  }
  
  /**
   * 편집을 취소합니다.
   * @returns {Object|null} 취소된 편집 정보
   */
  cancelCellEdit() {
    const cancelledEdit = this.cellInputState.cancelEditing();
    
    if (cancelledEdit) {
      // UI에서 원래 값으로 복원하는 로직을 여기서 처리할 수 있습니다.
      console.log('[EnhancedStorageManager] 편집이 취소되었습니다:', cancelledEdit);
    }
    
    return cancelledEdit;
  }
  
  /**
   * 편집을 완료하고 저장을 예약합니다.
   * @returns {Object|null} 완료된 편집 정보
   */
  completeCellEdit() {
    const completedEdit = this.cellInputState.confirmEditing();
    
    if (completedEdit && completedEdit.hasChanged) {
      // 변경사항이 있는 경우에만 저장 예약
      this.scheduleSave(completedEdit);
    } else if (completedEdit) {
      console.log('[EnhancedStorageManager] 변경사항이 없어 저장을 건너뜁니다.');
    }
    
    return completedEdit;
  }
  
  /**
   * 저장을 예약합니다.
   * @param {Object} editData - 편집 데이터
   */
  scheduleSave(editData) {
    const saveKey = `${editData.cell.rowIndex}_${editData.cell.colIndex}`;
    
    // 기존 대기 중인 저장 작업이 있다면 취소
    if (this.pendingSaves.has(saveKey)) {
      const existingSave = this.pendingSaves.get(saveKey);
      clearTimeout(existingSave.timeoutId);
      console.log(`[EnhancedStorageManager] 기존 저장 작업이 취소되었습니다: ${saveKey}`);
    }
    
    // 새로운 저장 작업 예약 - 최신 값으로 덮어쓰기
    const timeoutId = setTimeout(() => {
      // 저장 시점에 최신 editData 사용
      const latestSave = this.pendingSaves.get(saveKey);
      if (latestSave) {
        this.executeSave(latestSave.editData);
        this.pendingSaves.delete(saveKey);
      }
    }, this.SAVE_DELAY);
    
    // 항상 최신 editData로 업데이트
    this.pendingSaves.set(saveKey, {
      editData,
      timeoutId,
      scheduledAt: Date.now()
    });
    
    console.log(`[EnhancedStorageManager] 저장이 예약되었습니다: ${saveKey}`);
  }
  
  /**
   * 실제 저장을 수행합니다.
   */
  executeSave(editData) {
    if (!this.legacyStore) return;
    
    const { rowIndex, key, value, cellIndex } = editData;
    
    // 기존 store.js의 updateCell 액션 호출
    this.legacyStore.dispatch('updateCell', {
      rowIndex,
      key,
      value,
      cellIndex
    });
  }
  
  /**
   * 대기 중인 모든 저장 작업을 즉시 처리합니다.
   */
  processPendingSaves() {
    if (this.pendingSaves.size === 0) return;
    
    for (const [, saveInfo] of this.pendingSaves) {
      clearTimeout(saveInfo.timeoutId);
      this.executeSave(saveInfo.editData);
    }
    
    this.pendingSaves.clear();
  }
  
  /**
   * 모든 대기 중인 저장 작업을 취소합니다.
   */
  cancelPendingSaves() {
    for (const [, saveInfo] of this.pendingSaves) {
      clearTimeout(saveInfo.timeoutId);
    }
    
    this.pendingSaves.clear();
  }
  
  /**
   * 편집 중인지 여부를 반환합니다.
   * @returns {boolean} 편집 중 여부
   */
  isEditing() {
    return this.cellInputState.isCurrentlyEditing();
  }
  
  /**
   * 원래 값을 반환합니다.
   * @returns {*} 원래 값
   */
  getOriginalValue() {
    return this.cellInputState.getOriginalValue();
  }
  
  /**
   * 임시 값을 반환합니다.
   * @returns {*} 임시 값
   */
  getTempValue() {
    return this.cellInputState.getTempValue();
  }
  
  /**
   * 현재 편집 정보를 반환합니다.
   * @returns {Object|null} 현재 편집 정보
   */
  getCurrentEditInfo() {
    return this.cellInputState.getCurrentEditInfo();
  }
  
  /**
   * 저장 지연 시간을 설정합니다.
   * @param {number} delay - 지연 시간 (밀리초)
   */
  setSaveDelay(delay) {
    this.SAVE_DELAY = delay;
    console.log(`[EnhancedStorageManager] 저장 지연 시간이 ${delay}ms로 설정되었습니다.`);
  }
  
  /**
   * 저장 매니저의 상태를 검증합니다.
   * @returns {boolean} 유효한 상태 여부
   */
  validate() {
    if (!this.cellInputState.validate()) {
      return false;
    }
    
    if (!this.legacyStore) {
      console.warn('[EnhancedStorageManager] 기존 store.js 인스턴스가 설정되지 않았습니다.');
    }
    
    return true;
  }
  
  /**
   * 디버깅을 위한 상태 정보를 반환합니다.
   * @returns {Object} 상태 정보
   */
  getDebugInfo() {
    return {
      cellInputState: this.cellInputState.getDebugInfo(),
      legacyStore: !!this.legacyStore,
      saveDelay: this.SAVE_DELAY,
      pendingSavesCount: this.pendingSaves.size,
      isProcessing: this.isProcessing,
      pendingSaves: Array.from(this.pendingSaves.entries()).map(([key, info]) => ({
        key,
        editData: info.editData,
        scheduledAt: info.scheduledAt
      }))
    };
  }
  
  /**
   * 저장 매니저를 초기화합니다.
   */
  reset() {
    this.cancelPendingSaves();
    this.cellInputState.reset();
    this.isProcessing = false;
    this.isInitialized = false;
    console.log('[EnhancedStorageManager] 저장 매니저가 초기화되었습니다.');
  }
  
  /**
   * 데이터를 로드하고 필요한 경우 마이그레이션을 실행합니다.
   * @returns {Object|null} 로드된 데이터 또는 null
   */
  loadData() {
    try {
      // 마이그레이션 상태 확인
      const migrationStatus = getMigrationStatus();
      
      if (migrationStatus.needsMigration) {
        const migrationResult = executeMigration();
        
        if (!migrationResult.success) {
          console.error('[EnhancedStorageManager] 마이그레이션 실패:', migrationResult.error);
          return null;
        }
      }
      
      // 새로운 형식의 데이터 로드
      const newData = localStorage.getItem('epidemiology_data');
      
      if (newData) {
        const parsedData = JSON.parse(newData);
        this.isInitialized = true;
        return parsedData;
      }
      
      return null;
      
    } catch (error) {
      console.error('[EnhancedStorageManager] 데이터 로드 중 오류 발생:', error);
      return null;
    }
  }
  
  /**
   * 데이터를 새로운 형식으로 저장합니다.
   * @param {Object} data - 저장할 데이터
   * @returns {boolean} 저장 성공 여부
   */
  saveData(data) {
    try {
      const saveData = {
        version: '1.0',
        timestamp: Date.now(),
        ...data
      };
      
      localStorage.setItem('epidemiology_data', JSON.stringify(saveData));
      return true;
      
    } catch (error) {
      console.error('[EnhancedStorageManager] 데이터 저장 중 오류 발생:', error);
      return false;
    }
  }
  
  /**
   * 현재 상태를 새로운 형식으로 저장합니다.
   * @returns {boolean} 저장 성공 여부
   */
  saveCurrentState() {
    if (!this.legacyStore) {
      console.error('[EnhancedStorageManager] 기존 store.js 인스턴스가 설정되지 않았습니다.');
      return false;
    }
    
    const currentState = this.legacyStore.state;
    
    // 유효성 검사 오류를 안전하게 변환
    const validationErrors = {};
    if (currentState.validationState?.errors) {
      currentState.validationState.errors.forEach((error, key) => {
        // error가 객체인지 확인하고 안전하게 저장
        if (typeof error === 'object' && error !== null) {
          validationErrors[key] = {
            message: error.message || '유효성 검사 오류',
            timestamp: error.timestamp || Date.now()
          };
        } else if (typeof error === 'string') {
          validationErrors[key] = {
            message: error,
            timestamp: Date.now()
          };
        } else {
          validationErrors[key] = {
            message: '유효성 검사 오류',
            timestamp: Date.now()
          };
        }
      });
    }
    
    const data = {
      headers: currentState.headers,
      rows: currentState.rows,
      settings: {
        isIndividualExposureColumnVisible: currentState.isIndividualExposureColumnVisible,
        isConfirmedCaseColumnVisible: currentState.isConfirmedCaseColumnVisible
      },
      validationState: {
        errors: validationErrors,
        version: currentState.validationState?.version || 0
      }
    };
    
    console.log('[EnhancedStorageManager] 유효성 검사 오류 저장:', validationErrors);
    return this.saveData(data);
  }
} 