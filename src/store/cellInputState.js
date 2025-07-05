/**
 * 셀 입력 상태 관리 클래스
 * 편집 중인 셀의 상태와 임시 값을 관리합니다.
 */
export class CellInputState {
  constructor() {
    this.isEditing = false;
    this.currentCell = null;        // { rowIndex, colIndex, dataKey, cellIndex }
    this.originalValue = null;      // 편집 시작 전 원래 값
    this.tempValue = null;          // 편집 중인 임시 값
    this.columnMeta = null;         // 컬럼 메타 정보
    this.editStartTime = null;      // 편집 시작 시간
  }
  
  /**
   * 셀 편집을 시작합니다.
   * @param {number} rowIndex - 행 인덱스
   * @param {number} colIndex - 열 인덱스
   * @param {*} originalValue - 편집 시작 전 원래 값
   * @param {Object} columnMeta - 컬럼 메타 정보
   */
  startEditing(rowIndex, colIndex, originalValue, columnMeta) {
    // 이미 편집 중인 다른 셀이 있다면 안전하게 종료
    if (this.isEditing && this.currentCell) {
      console.warn('이미 편집 중인 셀이 있습니다. 기존 편집을 종료합니다.');
      this.cancelEditing();
    }
    
    this.isEditing = true;
    this.currentCell = { 
      rowIndex, 
      colIndex, 
      dataKey: columnMeta.dataKey, 
      cellIndex: columnMeta.cellIndex 
    };
    this.originalValue = originalValue;
    this.tempValue = originalValue;
    this.columnMeta = { ...columnMeta };
    this.editStartTime = Date.now();
    
    console.log('[CellInputState] 편집 시작:', {
      cell: this.currentCell,
      originalValue: this.originalValue,
      columnMeta: this.columnMeta
    });
  }
  
  /**
   * 편집 중인 임시 값을 업데이트합니다.
   * @param {number} rowIndex - 행 인덱스 (선택적, 현재 편집 중인 셀과 일치하는지 확인)
   * @param {number} colIndex - 열 인덱스 (선택적, 현재 편집 중인 셀과 일치하는지 확인)
   * @param {*} value - 새로운 임시 값
   * @param {Object} columnMeta - 컬럼 메타 정보 (선택적, 향후 확장을 위해 유지)
   */
  updateTempValue(rowIndex, colIndex, value, columnMeta = null) {
    if (!this.isEditing) {
      console.warn('편집 중이 아닌 상태에서 임시 값 업데이트를 시도했습니다.');
      return;
    }
    
    // 파라미터가 제공된 경우 현재 편집 중인 셀과 일치하는지 확인
    if (rowIndex !== undefined && colIndex !== undefined) {
      if (this.currentCell.rowIndex !== rowIndex || this.currentCell.colIndex !== colIndex) {
        console.warn('현재 편집 중인 셀과 다른 셀의 임시 값 업데이트를 시도했습니다.');
        return;
      }
    }
    
    this.tempValue = value;
    console.log('[CellInputState] 임시 값 업데이트:', value);
    
    // columnMeta를 사용하지 않는다는 것을 명시적으로 표시
    if (columnMeta) {
      // 향후 확장을 위해 유지 (예: 유효성 검사, 타입 변환 등)
    }
  }
  
  /**
   * 편집을 취소하고 원래 값으로 복원합니다.
   * @returns {Object|null} 취소된 편집 정보 또는 null
   */
  cancelEditing() {
    if (!this.isEditing) {
      console.warn('편집 중이 아닌 상태에서 편집 취소를 시도했습니다.');
      return null;
    }
    
    const cancelledEdit = {
      cell: { ...this.currentCell },
      originalValue: this.originalValue,
      tempValue: this.tempValue,
      columnMeta: { ...this.columnMeta },
      editDuration: Date.now() - this.editStartTime
    };
    
    this.reset();
    
    console.log('[CellInputState] 편집 취소:', cancelledEdit);
    return cancelledEdit;
  }
  
  /**
   * 편집을 완료하고 실제 저장할 값을 반환합니다.
   * @returns {Object|null} 완료된 편집 정보 또는 null
   */
  confirmEditing() {
    if (!this.isEditing) {
      console.warn('편집 중이 아닌 상태에서 편집 완료를 시도했습니다.');
      return null;
    }
    
    const completedEdit = {
      cell: { ...this.currentCell },
      originalValue: this.originalValue,
      value: this.tempValue,
      columnMeta: { ...this.columnMeta },
      editDuration: Date.now() - this.editStartTime,
      hasChanged: this.originalValue !== this.tempValue
    };
    
    this.reset();
    
    console.log('[CellInputState] 편집 완료:', completedEdit);
    return completedEdit;
  }
  
  /**
   * 편집을 완료합니다 (confirmEditing의 별칭).
   * @param {boolean} shouldSave - 저장 여부 (사용하지 않음, 호환성을 위해 유지)
   */
  stopEditing(shouldSave = true) {
    if (shouldSave) {
      return this.confirmEditing();
    } else {
      return this.cancelEditing();
    }
  }
  
  /**
   * 현재 편집 중인 셀의 임시 값을 반환합니다.
   * @param {number} rowIndex - 행 인덱스 (선택적, 현재 편집 중인 셀과 일치하는지 확인)
   * @param {number} colIndex - 열 인덱스 (선택적, 현재 편집 중인 셀과 일치하는지 확인)
   * @returns {*} 임시 값
   */
  getTempValue(rowIndex = null, colIndex = null) {
    if (!this.isEditing) {
      return null;
    }
    
    // 파라미터가 제공된 경우 현재 편집 중인 셀과 일치하는지 확인
    if (rowIndex !== null && colIndex !== null) {
      if (this.currentCell.rowIndex !== rowIndex || this.currentCell.colIndex !== colIndex) {
        return null;
      }
    }
    
    return this.tempValue;
  }
  
  /**
   * 현재 편집 중인 셀 정보를 반환합니다.
   * @returns {Object|null} 현재 편집 중인 셀 정보
   */
  getCurrentEditInfo() {
    if (!this.isEditing) return null;
    
    return {
      cell: { ...this.currentCell },
      originalValue: this.originalValue,
      tempValue: this.tempValue,
      columnMeta: { ...this.columnMeta },
      editDuration: Date.now() - this.editStartTime
    };
  }
  
  /**
   * 편집 중인지 여부를 반환합니다.
   * @returns {boolean} 편집 중 여부
   */
  isCurrentlyEditing() {
    return this.isEditing;
  }
  
  /**
   * 원래 값을 반환합니다.
   * @returns {*} 원래 값
   */
  getOriginalValue() {
    return this.originalValue;
  }
  
  /**
   * 편집 상태를 초기화합니다.
   */
  reset() {
    this.isEditing = false;
    this.currentCell = null;
    this.originalValue = null;
    this.tempValue = null;
    this.columnMeta = null;
    this.editStartTime = null;
  }
  
  /**
   * 편집 상태를 검증합니다.
   * @returns {boolean} 유효한 편집 상태 여부
   */
  validate() {
    if (!this.isEditing) return true;
    
    if (!this.currentCell || !this.columnMeta) {
      console.error('[CellInputState] 편집 상태가 불완전합니다.');
      return false;
    }
    
    return true;
  }
  
  /**
   * 디버깅을 위한 상태 정보를 반환합니다.
   * @returns {Object} 상태 정보
   */
  getDebugInfo() {
    return {
      isEditing: this.isEditing,
      currentCell: this.currentCell,
      originalValue: this.originalValue,
      tempValue: this.tempValue,
      columnMeta: this.columnMeta,
      editStartTime: this.editStartTime,
      editDuration: this.editStartTime ? Date.now() - this.editStartTime : 0
    };
  }
}

export function useCellInputState() {
  return new CellInputState();
} 