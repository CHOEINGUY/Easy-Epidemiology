import { CellInputState } from './cellInputState.js';
import { safeLoadFromStorage } from './utils/recovery.js';


/**
 * 개선된 저장 매니저 클래스
 * 셀 단위 저장과 디바운싱을 통해 성능을 최적화합니다.
 */
export class EnhancedStorageManager {
  constructor(legacyStore = null, userManager = null) {
    this.cellInputState = new CellInputState();
    this.legacyStore = legacyStore; // 기존 store.js 인스턴스
    this.userManager = userManager; // 사용자 관리자
    this.currentUser = null; // 현재 사용자
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
   * 사용자 관리자를 설정합니다.
   * @param {Object} userManager - 사용자 관리자 인스턴스
   */
  setUserManager(userManager) {
    this.userManager = userManager;
    console.log('[EnhancedStorageManager] 사용자 관리자가 설정되었습니다.');
  }
  
  /**
   * 현재 사용자를 설정합니다.
   * @param {Object} user - 현재 사용자 정보
   */
  setCurrentUser(user) {
    this.currentUser = user;
    console.log('[EnhancedStorageManager] 현재 사용자가 설정되었습니다:', user?.username);
  }
  
  /**
   * 사용자별 데이터 키를 생성합니다.
   * @returns {string} 데이터 키
   */
  getUserDataKey() {
    if (!this.currentUser) {
      return 'epidemiology_data'; // 기존 호환성
    }
    return this.userManager?.getUserDataKey(this.currentUser.username) || 'epidemiology_data';
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
    this.legacyStore.dispatch('epidemic/updateCell', {
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
      // 사용자별 데이터 키 사용
      const dataKey = this.getUserDataKey();
      const newData = localStorage.getItem(dataKey);
      
      if (newData) {
        const parsedData = JSON.parse(newData);
        this.isInitialized = true;
        return parsedData;
      }

      // --- 마이그레이션 로직 ---
      console.log('[EnhancedStorageManager] 새로운 형식의 데이터가 없습니다. 레거시 데이터 마이그레이션을 시도합니다.');
      
      // 1. headers, rows, 기본 visibility 로드
      const legacyData = safeLoadFromStorage();
      
      // 2. 추가 설정 로드 (StoreBridge가 아닌 settings.js에서 관리하던 항목들)
      const exposureDateTime = localStorage.getItem('exposureDateTime') || '';
      const selectedSuspectedFoods = localStorage.getItem('selectedSuspectedFoods') || '';
      
      let epidemicCurveSettings = null;
      try {
        const savedCurve = localStorage.getItem('epidemicCurveSettings');
        if (savedCurve) epidemicCurveSettings = JSON.parse(savedCurve);
      } catch (e) {
        console.warn('Failed to load legacy epidemicCurveSettings', e);
      }

      let analysisResults = { caseControl: [], cohort: [] };
      try {
        const savedResults = localStorage.getItem('analysisResults');
        if (savedResults) analysisResults = JSON.parse(savedResults);
      } catch (e) {
        console.warn('Failed to load legacy analysisResults', e);
      }

      let yatesCorrectionSettings = { caseControl: false, cohort: false };
      try {
        const savedYates = localStorage.getItem('yatesCorrectionSettings');
        if (savedYates) yatesCorrectionSettings = JSON.parse(savedYates);
      } catch (e) {
        console.warn('Failed to load legacy yatesCorrectionSettings', e);
      }

      // 3. 통합 데이터 객체 구성
      const migratedData = {
        version: '2.0', // 마이그레이션된 버전
        timestamp: Date.now(),
        headers: legacyData.headers,
        rows: legacyData.rows,
        settings: {
          // 기존 safeLoadFromStorage에서 가져온 것들
          isIndividualExposureColumnVisible: legacyData.settings.isIndividualExposureColumnVisible,
          isConfirmedCaseColumnVisible: legacyData.settings.isConfirmedCaseColumnVisible,
          
          // 추가 로드한 것들
          exposureDateTime,
          selectedSuspectedFoods,
          epidemicCurveSettings,
          analysisResults,
          yatesCorrectionSettings,
          
          // 기본값들
          selectedSymptomInterval: 6, 
          selectedIncubationInterval: 6,
          suspectedSource: '', 
          analysisOptions: { statMethod: 'chi-square', haldaneCorrection: false }
        },
        validationState: { errors: {}, version: 0 }
      };

      if (legacyData) {
        console.log('[EnhancedStorageManager] 레거시 데이터 마이그레이션 성공. 새로운 형식으로 저장합니다.');
        this.saveData(migratedData); // 새 형식으로 저장
        this.isInitialized = true;
        return migratedData;
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
        version: '2.0',
        timestamp: Date.now(),
        userId: this.currentUser?.username,
        ...data
      };
      
      // 사용자별 데이터 키 사용
      const dataKey = this.getUserDataKey();
      localStorage.setItem(dataKey, JSON.stringify(saveData));
      console.log('[EnhancedStorageManager] 데이터가 저장되었습니다:', dataKey);
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
    if (currentState.epidemic.validationState?.errors) {
      currentState.epidemic.validationState.errors.forEach((error, key) => {
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
    
    // settings 모듈의 전체 상태 저장
    const settingsState = currentState.settings;

    const data = {
      headers: currentState.epidemic.headers,
      rows: currentState.epidemic.rows,
      settings: {
        // 기존
        isIndividualExposureColumnVisible: settingsState.isIndividualExposureColumnVisible,
        isConfirmedCaseColumnVisible: settingsState.isConfirmedCaseColumnVisible,
        
        // 추가: 모든 설정 상태 저장
        selectedSymptomInterval: settingsState.selectedSymptomInterval,
        exposureDateTime: settingsState.exposureDateTime,
        selectedIncubationInterval: settingsState.selectedIncubationInterval,
        analysisOptions: settingsState.analysisOptions,
        yatesCorrectionSettings: settingsState.yatesCorrectionSettings,
        selectedSuspectedFoods: settingsState.selectedSuspectedFoods,
        epidemicCurveSettings: settingsState.epidemicCurveSettings,
        suspectedSource: settingsState.suspectedSource,
        analysisResults: settingsState.analysisResults
      },
      validationState: {
        errors: validationErrors,
        version: currentState.epidemic.validationState?.version || 0
      }
    };
    
    return this.saveData(data);
  }
} 