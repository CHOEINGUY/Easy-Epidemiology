/**
 * ValidationStructuralMapper.js
 * 열 구조 변경 감지 및 에러 키 재매핑 모듈
 * ---------------------------------
 * • 열 추가/삭제 감지
 * • 에러 키 재매핑
 * • 구조적 변경 분석
 */

import { 
  getColumnUniqueKey, 
  getErrorKey, 
  parseErrorKey 
} from '../components/DataInputVirtualScroll/utils/validationUtils.js';

/**
 * 열 구조 변경 감지 및 에러 키 재매핑 클래스
 */
export class ValidationStructuralMapper {
  /**
   * @param {Object} store - Vuex store 인스턴스
   * @param {Object} errorManager - ValidationErrorManager 인스턴스
   * @param {Object} options - 설정 옵션
   */
  constructor(store, errorManager, options = {}) {
    this.store = store;
    this.errorManager = errorManager;
    this.debug = options.debug || false;
  }

  /**
   * validateCell 함수 주입
   * @param {Function} validateCellFn - 셀 검증 함수
   */
  setValidateCellFn(validateCellFn) {
    this._validateCellFn = validateCellFn;
  }

  /**
   * _getCellValue 함수 주입
   * @param {Function} getCellValueFn - 셀 값 조회 함수
   */
  setGetCellValueFn(getCellValueFn) {
    this._getCellValueFn = getCellValueFn;
  }

  /**
   * 열 구조 변경 후 validationErrors Map의 키를 올바르게 재매핑
   * @param {Array} oldColumnsMeta - 변경 전 컬럼 메타 배열
   * @param {Array} newColumnsMeta - 변경 후 컬럼 메타 배열
   * @param {Array} deletedColIndices - 삭제된 열의 colIndex 배열
   */
  remapValidationErrorsByColumnIdentity(oldColumnsMeta, newColumnsMeta, deletedColIndices = []) {
    const currentErrors = this.store.state.epidemic.validationState.errors;
    if (!currentErrors || currentErrors.size === 0) {
      return;
    }

    if (this.debug) {
      console.log('[ValidationStructuralMapper] remapValidationErrorsByColumnIdentity 시작');
      console.log('[ValidationStructuralMapper] 변경 전 에러 개수:', currentErrors.size);
      console.log('[ValidationStructuralMapper] 변경 전 에러 키들:', Array.from(currentErrors.keys()));
      console.log('[ValidationStructuralMapper] deletedColIndices:', deletedColIndices);
    }

    // 1. 구조적 변경 사항 분석
    const structuralChanges = this._analyzeStructuralChanges(oldColumnsMeta, newColumnsMeta, deletedColIndices);
    if (this.debug) {
      console.log('[ValidationStructuralMapper] 구조적 변경 사항:', structuralChanges);
    }
    
    // 2. 각 에러에 대해 새로운 위치 계산
    const newErrors = new Map();
    const rows = this.store.state.rows || [];

    for (const [oldErrorKey, error] of currentErrors) {
      const newErrorKey = this._calculateNewErrorKey(oldErrorKey, structuralChanges, oldColumnsMeta, newColumnsMeta, rows);
      
      if (newErrorKey) {
        newErrors.set(newErrorKey, error);
        if (this.debug) {
          console.log(`[ValidationStructuralMapper] 에러 키 변환: ${oldErrorKey} -> ${newErrorKey}`);
        }
      } else if (this.debug) {
        console.log(`[ValidationStructuralMapper] 에러 키 제거: ${oldErrorKey} (삭제된 열)`);
      }
    }

    if (this.debug) {
      console.log('[ValidationStructuralMapper] 변경 후 에러 개수:', newErrors.size);
      console.log('[ValidationStructuralMapper] 변경 후 에러 키들:', Array.from(newErrors.keys()));
    }

    // 3. 새로운 에러 맵 적용
    this.errorManager.setErrors(newErrors);
    
    // 4. 새로 추가된 열들에 대한 검증 수행
    const currentRows = this.store.state.rows || [];
    if (structuralChanges.insertions.length > 0 && currentRows.length > 0 && this._validateCellFn) {
      for (const insertion of structuralChanges.insertions) {
        const addedColumns = newColumnsMeta.filter(col => {
          const colUniqueKey = getColumnUniqueKey(col);
          return colUniqueKey.includes(`__${insertion.position}`) || 
                 (col.colIndex >= insertion.position && col.colIndex < insertion.position + insertion.count);
        });
        
        currentRows.forEach((row, rowIndex) => {
          addedColumns.forEach(columnMeta => {
            const value = this._getCellValue(row, columnMeta);
            if (value !== '' && value !== null && value !== undefined) {
              this._validateCellFn(rowIndex, columnMeta.colIndex, value, columnMeta.type, true);
            }
          });
        });
      }
    }
  }

  /**
   * 기존 colIndex 기반 재매핑 함수 (하위 호환성용)
   * @param {Array} oldColumnsMeta - 변경 전 컬럼 메타 배열
   * @param {Array} newColumnsMeta - 변경 후 컬럼 메타 배열
   */
  remapValidationErrorsByColumnOrder(oldColumnsMeta, newColumnsMeta) {
    this.remapValidationErrorsByColumnIdentity(oldColumnsMeta, newColumnsMeta);
  }

  /**
   * 구조적 변경 사항을 분석하여 변경 정보를 반환
   * @param {Array} oldColumnsMeta - 변경 전 컬럼 메타 배열
   * @param {Array} newColumnsMeta - 변경 후 컬럼 메타 배열
   * @param {Array} deletedColIndices - 삭제된 열의 colIndex 배열
   * @returns {Object} 구조적 변경 정보
   */
  _analyzeStructuralChanges(oldColumnsMeta, newColumnsMeta, deletedColIndices = []) {
    if (this.debug) {
      console.log('[ValidationStructuralMapper] _analyzeStructuralChanges 시작');
      console.log('[ValidationStructuralMapper] 변경 전 열 개수:', oldColumnsMeta.length);
      console.log('[ValidationStructuralMapper] 변경 후 열 개수:', newColumnsMeta.length);
    }
    
    const changes = {
      insertions: [],
      deletions: [],
      typeChanges: {},
      totalOldCols: oldColumnsMeta.length,
      totalNewCols: newColumnsMeta.length
    };

    // 1. 타입별 그룹 분석
    const oldGroups = this._groupColumnsByType(oldColumnsMeta);
    const newGroups = this._groupColumnsByType(newColumnsMeta);
    
    if (this.debug) {
      console.log('[ValidationStructuralMapper] 변경 전 타입별 그룹:', oldGroups);
      console.log('[ValidationStructuralMapper] 변경 후 타입별 그룹:', newGroups);
    }

    // 2. 각 타입별로 변경 사항 분석
    for (const type of new Set([...Object.keys(oldGroups), ...Object.keys(newGroups)])) {
      const oldCols = oldGroups[type] || [];
      const newCols = newGroups[type] || [];
      
      if (this.debug) {
        console.log(`[ValidationStructuralMapper] 타입 ${type} 분석: 기존 ${oldCols.length}개 -> 새로 ${newCols.length}개`);
      }
      
      if (oldCols.length !== newCols.length) {
        if (newCols.length > oldCols.length) {
          const addedCount = newCols.length - oldCols.length;
          const insertPosition = this._findInsertionPosition(oldCols, newCols);
          changes.insertions.push({
            position: insertPosition,
            count: addedCount,
            type
          });
          if (this.debug) {
            console.log(`[ValidationStructuralMapper] 열 추가 감지: ${type}, position=${insertPosition}, count=${addedCount}`);
          }
        } else {
          const deletedCount = oldCols.length - newCols.length;
          let deletePosition;
          
          if (deletedColIndices.length > 0) {
            const deletedCol = oldCols.find(col => deletedColIndices.includes(col.colIndex));
            if (deletedCol) {
              deletePosition = deletedCol.cellIndex !== undefined ? deletedCol.cellIndex : deletedCol.colIndex;
            } else {
              deletePosition = this._findDeletionPosition(oldCols, newCols);
            }
          } else {
            deletePosition = this._findDeletionPosition(oldCols, newCols);
          }
          
          changes.deletions.push({
            position: deletePosition,
            count: deletedCount,
            type
          });
          if (this.debug) {
            console.log(`[ValidationStructuralMapper] 열 삭제 감지: ${type}, position=${deletePosition}, count=${deletedCount}`);
          }
        }
      }
    }

    // 3. 열 매핑 (타입과 cellIndex 기반)
    for (const oldCol of oldColumnsMeta) {
      const matchingNewCol = newColumnsMeta.find(newCol => 
        newCol.type === oldCol.type && 
        newCol.cellIndex === oldCol.cellIndex &&
        (newCol.group || '') === (oldCol.group || '')
      );
      
      if (matchingNewCol) {
        changes.typeChanges[oldCol.colIndex] = matchingNewCol.colIndex;
        if (this.debug) {
          console.log(`[ValidationStructuralMapper] 열 매핑: ${oldCol.colIndex} -> ${matchingNewCol.colIndex} (${oldCol.type})`);
        }
      }
    }

    if (this.debug) {
      console.log('[ValidationStructuralMapper] 최종 구조적 변경 사항:', changes);
    }
    return changes;
  }

  /**
   * 타입별로 컬럼을 그룹화
   * @param {Array} columnsMeta - 컬럼 메타 배열
   * @returns {Object} 타입별 그룹화된 컬럼 정보
   */
  _groupColumnsByType(columnsMeta) {
    const groups = {};
    for (const col of columnsMeta) {
      if (!groups[col.type]) {
        groups[col.type] = [];
      }
      groups[col.type].push(col);
    }
    return groups;
  }

  /**
   * 열 추가 위치 찾기
   * @param {Array} oldCols - 변경 전 같은 타입 열들
   * @param {Array} newCols - 변경 후 같은 타입 열들
   * @returns {number} 삽입 영향 시작 위치
   */
  _findInsertionPosition(oldCols, newCols) {
    const oldColIndices = new Set(oldCols.map(col => col.colIndex));
    const newColsAdded = newCols.filter(col => !oldColIndices.has(col.colIndex));
    
    if (newColsAdded.length > 0) {
      const minNewColIndex = Math.min(...newColsAdded.map(col => col.colIndex));
      return minNewColIndex;
    }
    
    return oldCols.length > 0 ? oldCols[0].colIndex : 0;
  }

  /**
   * 열 삭제 위치 찾기
   * @param {Array} oldCols - 변경 전 같은 타입 열들
   * @param {Array} newCols - 변경 후 같은 타입 열들
   * @returns {number} 삭제 위치
   */
  _findDeletionPosition(oldCols, newCols) {
    if (this.debug) {
      console.log(`[ValidationStructuralMapper] _findDeletionPosition: oldCols=${oldCols.length}개, newCols=${newCols.length}개`);
    }
    
    const newColIndices = new Set(newCols.map(col => col.colIndex));
    const deletedCols = oldCols.filter(col => !newColIndices.has(col.colIndex));
    
    if (deletedCols.length > 0) {
      const deletedColWithMinColIndex = deletedCols.reduce((min, col) => {
        return col.colIndex < min.colIndex ? col : min;
      });
      
      const deletionCellIndex = deletedColWithMinColIndex.cellIndex !== undefined ? 
        deletedColWithMinColIndex.cellIndex : deletedColWithMinColIndex.colIndex;
      
      if (this.debug) {
        console.log(`[ValidationStructuralMapper] _findDeletionPosition: 삭제된 열 cellIndex=${deletionCellIndex}`);
      }
      return deletionCellIndex;
    }
    
    return oldCols.length > 0 ? 
      (oldCols[oldCols.length - 1].cellIndex !== undefined ? oldCols[oldCols.length - 1].cellIndex : oldCols[oldCols.length - 1].colIndex) : 0;
  }

  /**
   * 기존 에러 키에 대한 새로운 에러 키 계산
   * @param {string} oldErrorKey - 기존 에러 키
   * @param {Object} structuralChanges - 구조적 변경 정보
   * @param {Array} oldColumnsMeta - 변경 전 컬럼 메타 배열
   * @param {Array} newColumnsMeta - 변경 후 컬럼 메타 배열
   * @param {Array} rows - 현재 데이터 행들
   * @returns {string|null} 새로운 에러 키 또는 null
   */
  _calculateNewErrorKey(oldErrorKey, structuralChanges, oldColumnsMeta, newColumnsMeta, rows) {
    if (this.debug) {
      console.log(`[ValidationStructuralMapper] _calculateNewErrorKey 시작: ${oldErrorKey}`);
    }
    
    // 1. 기존 에러 키 파싱
    const isUniqueKeyFormat = oldErrorKey.includes('__') || 
      oldErrorKey.includes('confirmed_case') || 
      oldErrorKey.includes('patient_id') || 
      oldErrorKey.includes('patient_name') || 
      oldErrorKey.includes('exposure_');
    
    let rowIndex, colIndex, newCellIndex;
    
    if (isUniqueKeyFormat) {
      if (this.debug) {
        console.log(`[ValidationStructuralMapper] 고유 식별자 기반 키 처리: ${oldErrorKey}`);
      }
      
      const parsed = parseErrorKey(oldErrorKey);
      if (!parsed) {
        if (this.debug) {
          console.log(`[ValidationStructuralMapper] 키 파싱 실패: ${oldErrorKey}`);
        }
        return null;
      }
      
      rowIndex = parsed.rowIndex;
      
      // 고유 식별자에서 cellIndex 추출
      const uniqueKeyParts = parsed.uniqueKey.split('__');
      const oldCellIndex = uniqueKeyParts.length > 1 ? parseInt(uniqueKeyParts[uniqueKeyParts.length - 1]) : null;
      
      newCellIndex = oldCellIndex;
      if (oldCellIndex !== null && !isNaN(oldCellIndex)) {
        // 삽입 사항 적용
        for (const insertion of structuralChanges.insertions) {
          const currentColumnType = uniqueKeyParts[0];
          const isMatchingType = this._isMatchingType(insertion.type, currentColumnType);
          
          const insertionPosMeta = newColumnsMeta.find(col => col.colIndex === insertion.position && col.type === insertion.type);
          const insertionPosCellIndex = insertionPosMeta && insertionPosMeta.cellIndex !== undefined ? insertionPosMeta.cellIndex : insertion.position;
          
          if (isMatchingType && oldCellIndex >= insertionPosCellIndex) {
            newCellIndex += insertion.count;
          }
        }
        
        // 삭제 사항 적용
        for (const deletion of structuralChanges.deletions) {
          const currentColumnType = uniqueKeyParts[0];
          const isMatchingType = this._isMatchingType(deletion.type, currentColumnType);
          
          const deletionPosCellIndex = deletion.position;
          
          if (isMatchingType) {
            if (oldCellIndex >= deletionPosCellIndex + deletion.count) {
              newCellIndex -= deletion.count;
            } else if (oldCellIndex >= deletionPosCellIndex) {
              newCellIndex = deletionPosCellIndex;
            }
          }
        }
      }
      
      // 새로운 cellIndex로 고유 식별자 재구성
      let newUniqueKey;
      if (oldCellIndex !== null && !isNaN(oldCellIndex)) {
        const baseUniqueKey = uniqueKeyParts.slice(0, -1).join('__');
        newUniqueKey = newCellIndex !== null && !isNaN(newCellIndex) 
          ? `${baseUniqueKey}__${newCellIndex}`
          : baseUniqueKey;
      } else {
        newUniqueKey = parsed.uniqueKey;
      }
      
      // 새로운 고유 식별자로 colIndex 찾기
      const matchingNewCol = newColumnsMeta.find(col => {
        const colUniqueKey = getColumnUniqueKey(col);
        return colUniqueKey === newUniqueKey;
      });
      
      if (!matchingNewCol) {
        // 타입과 cellIndex로 직접 찾기 시도
        const fallbackType = uniqueKeyParts.length > 1 ? uniqueKeyParts[1] : null;
        const fallbackMatch = newColumnsMeta.find(col => 
          col.type === fallbackType && 
          col.cellIndex === newCellIndex
        );
        
        if (fallbackMatch) {
          colIndex = fallbackMatch.colIndex;
        } else {
          return null;
        }
      } else {
        colIndex = matchingNewCol.colIndex;
      }
    } else {
      // 기존 rowIndex_colIndex 형식 키 파싱
      const parts = oldErrorKey.split('_');
      if (parts.length !== 2) return null;
      
      rowIndex = parseInt(parts[0]);
      const oldColIndex = parseInt(parts[1]);
      
      const newColIndex = this._calculateNewColIndex(oldColIndex, structuralChanges, oldColumnsMeta, newColumnsMeta);
      if (newColIndex === null) {
        return null;
      }
      
      colIndex = newColIndex;
    }

    // 2. 새로운 위치의 유효성 검사
    const newColumnMeta = newColumnsMeta.find(col => col.colIndex === colIndex);
    if (!newColumnMeta) {
      return null;
    }

    // 3. 해당 셀에 실제 값이 있는지 확인
    if (rows[rowIndex]) {
      const tempColumnMeta = { ...newColumnMeta };
      if (newCellIndex !== null && newCellIndex !== undefined && !isNaN(newCellIndex)) {
        tempColumnMeta.cellIndex = newCellIndex;
      }
      
      const hasValue = this._cellHasValue(rows[rowIndex], tempColumnMeta);
      if (!hasValue) {
        return null;
      }
    } else {
      return null;
    }

    // 4. 새로운 에러 키 생성
    let newErrorKey;
    if (isUniqueKeyFormat) {
      const finalColMeta = { ...newColumnMeta };
      if (newCellIndex !== undefined && newCellIndex !== null && !isNaN(newCellIndex)) {
        finalColMeta.cellIndex = newCellIndex;
      }
      const finalUniqueKey = getColumnUniqueKey(finalColMeta);
      newErrorKey = getErrorKey(rowIndex, finalUniqueKey);
    } else {
      newErrorKey = `${rowIndex}_${colIndex}`;
    }
    
    return newErrorKey;
  }

  /**
   * 타입 매칭 확인
   * @param {string} type1 - 타입 1
   * @param {string} type2 - 타입 2
   * @returns {boolean} 매칭 여부
   */
  _isMatchingType(type1, type2) {
    if (type1 === type2) return true;
    
    const typeMap = {
      'isConfirmedCase': 'confirmed',
      'patientId': 'patient',
      'patientName': 'patient',
      'individualExposureTime': 'exposure'
    };
    
    return typeMap[type1] === type2;
  }

  /**
   * 구조적 변경 사항을 적용하여 새로운 colIndex 계산
   * @param {number} oldColIndex - 기존 colIndex
   * @param {Object} structuralChanges - 구조적 변경 정보
   * @param {Array} oldColumnsMeta - 변경 전 컬럼 메타 배열
   * @param {Array} newColumnsMeta - 변경 후 컬럼 메타 배열
   * @returns {number|null} 새로운 colIndex 또는 null
   */
  _calculateNewColIndex(oldColIndex, structuralChanges, oldColumnsMeta, newColumnsMeta) {
    const oldColumnMeta = oldColumnsMeta.find(col => col.colIndex === oldColIndex);
    if (!oldColumnMeta) {
      return null;
    }

    // 1. 직접 매핑이 있는 경우
    if (structuralChanges.typeChanges[oldColIndex] !== undefined) {
      return structuralChanges.typeChanges[oldColIndex];
    }

    // 2. 같은 타입의 새로운 열 찾기
    const matchingNewCol = newColumnsMeta.find(col => 
      col.type === oldColumnMeta.type && 
      col.cellIndex === oldColumnMeta.cellIndex &&
      (col.group || '') === (oldColumnMeta.group || '')
    );
    
    if (matchingNewCol) {
      return matchingNewCol.colIndex;
    }

    // 3. 구조적 변경 사항 적용
    let newColIndex = oldColIndex;
    
    for (const insertion of structuralChanges.insertions) {
      if (oldColIndex >= insertion.position) {
        newColIndex += insertion.count;
      }
    }
    
    for (const deletion of structuralChanges.deletions) {
      if (oldColIndex >= deletion.position + deletion.count) {
        newColIndex -= deletion.count;
      } else if (oldColIndex >= deletion.position) {
        return null;
      }
    }

    // 4. 범위 확인
    if (newColIndex < 0 || newColIndex >= structuralChanges.totalNewCols) {
      return null;
    }

    return newColIndex;
  }

  /**
   * 셀에 값이 있는지 확인
   * @param {Object} row - 데이터 행
   * @param {Object} columnMeta - 컬럼 메타데이터
   * @returns {boolean} 값 존재 여부
   */
  _cellHasValue(row, columnMeta) {
    if (!row || !columnMeta.dataKey) {
      return false;
    }
    
    if (columnMeta.cellIndex !== null && columnMeta.cellIndex !== undefined) {
      const arr = row[columnMeta.dataKey];
      
      if (!Array.isArray(arr)) {
        return false;
      }
      
      if (columnMeta.cellIndex < 0 || columnMeta.cellIndex >= arr.length) {
        return false;
      }
      
      const value = arr[columnMeta.cellIndex];
      return value !== undefined && value !== null && value !== '';
    }
    
    const value = row[columnMeta.dataKey];
    return value !== undefined && value !== null && value !== '';
  }

  /**
   * 셀 값 조회 (주입된 함수 사용)
   * @private
   */
  _getCellValue(row, columnMeta) {
    if (this._getCellValueFn) {
      return this._getCellValueFn(row, columnMeta);
    }
    return row[columnMeta.dataKey];
  }

  /**
   * 리소스 정리
   */
  destroy() {
    // 특별한 정리 필요 없음
  }
}

export default ValidationStructuralMapper;
