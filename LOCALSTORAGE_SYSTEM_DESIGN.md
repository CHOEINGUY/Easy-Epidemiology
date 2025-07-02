# localStorage 기반 저장 시스템 설계

## 프로젝트 특성 분석
- **데이터 입력**: 가상 스크롤 그리드 탭에서만 발생
- **데이터 특성**: 대부분 0/1 값, 일부 텍스트/날짜
- **사용 패턴**: 단일 사용자, 집중적 입력 후 분석
- **목표**: 단순하고 효율적인 시스템

## 1. localStorage 저장 방식

### 1.1 저장 구조
```javascript
// 메인 데이터
localStorage.setItem('epidemiology_data', JSON.stringify({
  version: '1.0',
  timestamp: Date.now(),
  headers: { basic: [...], clinical: [...], diet: [...] },
  rows: [...],
  settings: { isIndividualExposureColumnVisible: false }
}));

// Undo/Redo 히스토리 (별도 저장)
localStorage.setItem('epidemiology_history', JSON.stringify({
  undoStack: [...],  // 최대 15개
  redoStack: [...],  // 최대 15개
  currentIndex: 0
}));
```

### 1.2 디바운싱 저장
```javascript
class StorageManager {
  constructor() {
    this.saveTimeout = null;
    this.SAVE_DELAY = 500; // 500ms 디바운싱
    this.pendingSave = false;
  }
  
  // 디바운싱된 저장
  debounceSave(data) {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.pendingSave = true;
    this.saveTimeout = setTimeout(() => {
      this.actualSave(data);
      this.pendingSave = false;
    }, this.SAVE_DELAY);
  }
  
  // 실제 저장 로직
  actualSave(data) {
    try {
      const saveData = {
        version: '1.0',
        timestamp: Date.now(),
        ...data
      };
      
      localStorage.setItem('epidemiology_data', JSON.stringify(saveData));
      this.showSaveStatus('저장 완료', 'success');
      
    } catch (error) {
      this.handleSaveError(error);
    }
  }
}
```

### 1.3 용량 관리
```javascript
// 저장 전 용량 체크
checkStorageSpace(data) {
  const dataSize = JSON.stringify(data).length;
  const available = this.getAvailableStorage();
  
  if (dataSize > available * 0.8) { // 80% 이상 사용 시 경고
    this.showWarning('저장공간이 부족합니다. 데이터를 내보내기 하세요.');
    return false;
  }
  return true;
}

getAvailableStorage() {
  try {
    const test = 'test';
    let total = 0;
    while (true) {
      localStorage.setItem('__test__', test.repeat(total));
      total += 1000;
    }
  } catch {
    localStorage.removeItem('__test__');
    return total * 2; // UTF-16 고려
  }
}
```

## 2. Undo/Redo 시스템

### 2.1 히스토리 관리
```javascript
class HistoryManager {
  constructor() {
    this.MAX_HISTORY = 15; // 메모리 절약
    this.isRestoring = false;
  }
  
  // 변경사항 저장
  saveState(currentState) {
    if (this.isRestoring) return;
    
    const history = this.loadHistory();
    const snapshot = {
      timestamp: Date.now(),
      data: {
        headers: structuredClone(currentState.headers),
        rows: structuredClone(currentState.rows)
      }
    };
    
    // 최대 개수 유지
    if (history.undoStack.length >= this.MAX_HISTORY) {
      history.undoStack.shift();
    }
    
    history.undoStack.push(snapshot);
    history.redoStack = []; // redo 스택 초기화
    
    this.saveHistory(history);
  }
  
  // 실행 취소
  undo() {
    const history = this.loadHistory();
    if (history.undoStack.length === 0) return null;
    
    const prevState = history.undoStack.pop();
    history.redoStack.push(this.getCurrentSnapshot());
    
    this.saveHistory(history);
    this.isRestoring = true;
    
    return prevState.data;
  }
  
  // 재실행
  redo() {
    const history = this.loadHistory();
    if (history.redoStack.length === 0) return null;
    
    const nextState = history.redoStack.pop();
    history.undoStack.push(this.getCurrentSnapshot());
    
    this.saveHistory(history);
    this.isRestoring = true;
    
    return nextState.data;
  }
}
```

### 2.2 키보드 단축키
```javascript
// DataInputVirtual.vue에 추가
function setupKeyboardShortcuts() {
  const handleKeyDown = (event) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'z':
          if (event.shiftKey) {
            event.preventDefault();
            handleRedo();
          } else {
            event.preventDefault();
            handleUndo();
          }
          break;
        case 'y':
          event.preventDefault();
          handleRedo();
          break;
      }
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}
```

## 3. 유효성 검사 시스템

### 3.1 데이터 검증 규칙
```javascript
class DataValidator {
  static RULES = {
    isPatient: {
      type: 'binary',
      required: false,
      allowEmpty: true
    },
    basicInfo: {
      type: 'array',
      itemType: 'string',
      maxLength: 100,
      required: false
    },
    clinicalSymptoms: {
      type: 'array', 
      itemType: 'binary',
      required: false
    },
    symptomOnset: {
      type: 'datetime',
      format: 'YYYY-MM-DD HH:mm',
      required: false
    },
    dietInfo: {
      type: 'array',
      itemType: 'binary',
      required: false
    }
  };
  
  // 셀 값 검증
  static validateCell(value, columnType, cellIndex = null) {
    const rule = this.RULES[columnType];
    if (!rule) return { valid: true };
    
    // 빈 값 처리
    if (this.isEmpty(value)) {
      return rule.required ? 
        { valid: false, message: '필수 입력 항목입니다.' } :
        { valid: true };
    }
    
    // 타입별 검증
    switch (rule.type) {
      case 'binary':
        return this.validateBinary(value);
      case 'string':
        return this.validateString(value, rule);
      case 'datetime':
        return this.validateDateTime(value, rule);
      case 'array':
        return cellIndex !== null ? 
          this.validateArrayItem(value, rule) :
          this.validateArray(value, rule);
      default:
        return { valid: true };
    }
  }
  
  static validateBinary(value) {
    if (value === '0' || value === '1' || value === 0 || value === 1) {
      return { valid: true };
    }
    return { 
      valid: false, 
      message: '0 또는 1만 입력 가능합니다.' 
    };
  }
  
  static validateDateTime(value, rule) {
    const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
    if (!regex.test(value)) {
      return { 
        valid: false, 
        message: 'YYYY-MM-DD HH:mm 형식으로 입력하세요.' 
      };
    }
    
    const date = new Date(value.replace(' ', 'T'));
    if (isNaN(date.getTime())) {
      return { 
        valid: false, 
        message: '올바른 날짜를 입력하세요.' 
      };
    }
    
    return { valid: true };
  }
}
```

### 3.2 실시간 검증 UI
```javascript
// 셀 입력 시 실시간 검증
function validateAndShowFeedback(value, columnType, cellElement) {
  const result = DataValidator.validateCell(value, columnType);
  
  if (!result.valid) {
    cellElement.classList.add('validation-error');
    showValidationTooltip(cellElement, result.message);
  } else {
    cellElement.classList.remove('validation-error');
    hideValidationTooltip(cellElement);
  }
  
  return result.valid;
}
```

### 3.3 데이터 복구 로직
```javascript
class DataRecovery {
  // 손상된 데이터 복구
  static repairData(rawData) {
    try {
      if (!rawData || typeof rawData !== 'object') {
        return this.createDefaultData();
      }
      
      const repaired = {
        version: rawData.version || '1.0',
        timestamp: rawData.timestamp || Date.now(),
        headers: this.repairHeaders(rawData.headers),
        rows: this.repairRows(rawData.rows, rawData.headers),
        settings: rawData.settings || { isIndividualExposureColumnVisible: false }
      };
      
      return repaired;
      
    } catch (error) {
      console.error('데이터 복구 실패:', error);
      return this.createDefaultData();
    }
  }
  
  static repairHeaders(headers) {
    return {
      basic: Array.isArray(headers?.basic) ? headers.basic : ['', ''],
      clinical: Array.isArray(headers?.clinical) ? headers.clinical : ['', '', '', '', ''],
      diet: Array.isArray(headers?.diet) ? headers.diet : Array(30).fill('')
    };
  }
  
  static repairRows(rows, headers) {
    if (!Array.isArray(rows)) return [];
    
    return rows.map(row => ({
      isPatient: row?.isPatient || '',
      basicInfo: Array.isArray(row?.basicInfo) ? 
        row.basicInfo : Array(headers?.basic?.length || 2).fill(''),
      clinicalSymptoms: Array.isArray(row?.clinicalSymptoms) ? 
        row.clinicalSymptoms : Array(headers?.clinical?.length || 5).fill(''),
      symptomOnset: row?.symptomOnset || '',
      individualExposureTime: row?.individualExposureTime || '',
      dietInfo: Array.isArray(row?.dietInfo) ? 
        row.dietInfo : Array(headers?.diet?.length || 30).fill('')
    }));
  }
}
```

## 4. 통합 시스템 구현

### 4.1 메인 매니저 클래스
```javascript
class EpidemiologyDataManager {
  constructor() {
    this.storage = new StorageManager();
    this.history = new HistoryManager();
    this.validator = DataValidator;
    this.recovery = DataRecovery;
  }
  
  // 데이터 변경 시 호출
  async updateData(newData, action = 'update') {
    // 1. 유효성 검사
    const validationResult = this.validateData(newData);
    if (!validationResult.valid) {
      this.showValidationErrors(validationResult.errors);
      return false;
    }
    
    // 2. 히스토리 저장 (특정 액션만)
    if (['update', 'delete', 'insert'].includes(action)) {
      this.history.saveState(this.getCurrentData());
    }
    
    // 3. 데이터 저장
    this.storage.debounceSave(newData);
    
    return true;
  }
  
  // 초기 로드
  loadData() {
    try {
      const rawData = localStorage.getItem('epidemiology_data');
      if (!rawData) return this.createInitialData();
      
      const parsed = JSON.parse(rawData);
      return this.recovery.repairData(parsed);
      
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      return this.createInitialData();
    }
  }
}
```

## 5. 개발 우선순위 및 소요시간

### Phase 1: 기본 저장 시스템 (2시간)
1. StorageManager 클래스 구현 (45분)
2. 디바운싱 저장 로직 (30분)  
3. 에러 처리 및 용량 체크 (30분)
4. 기존 코드와 연동 (15분)

### Phase 2: Undo/Redo 시스템 (2시간)
1. HistoryManager 클래스 구현 (60분)
2. 키보드 단축키 연동 (30분)
3. UI 버튼 상태 관리 (30분)

### Phase 3: 유효성 검사 (1.5시간)
1. DataValidator 클래스 구현 (45분)
2. 실시간 검증 UI (30분)
3. 데이터 복구 로직 (15분)

### Phase 4: 통합 및 테스트 (1시간)
1. EpidemiologyDataManager 구현 (30분)
2. 전체 시스템 테스트 (30분)

**총 예상 개발 시간: 6.5시간**

## 6. 핵심 장점

✅ **단순함**: 복잡한 라이브러리 없이 순수 JavaScript
✅ **효율성**: 디바운싱으로 성능 최적화  
✅ **안정성**: 에러 처리 및 데이터 복구 기능
✅ **확장성**: 모듈화된 구조로 추후 기능 추가 용이
✅ **사용자 경험**: 실시간 검증 및 Undo/Redo 지원

이 설계는 현재 프로젝트의 요구사항을 만족하면서도 구현 복잡도를 최소화한 실용적인 솔루션입니다. 