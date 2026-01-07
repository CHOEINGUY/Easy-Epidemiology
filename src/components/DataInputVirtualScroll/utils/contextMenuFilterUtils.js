/**
 * 필터 관련 유틸리티 함수들
 * contextMenuHandlers.js에서 분리됨
 */

/**
 * 필터가 활성화되어 있는지 확인합니다.
 * @param {number} colIndex - 컬럼 인덱스
 * @param {string} value - 필터 값
 * @param {object} context - 핸들러 컨텍스트
 * @returns {boolean}
 */
export function isFilterActive(colIndex, value, context) {
  if (!context.storeBridge || !context.storeBridge.filterState) {
    // 필터 상태가 없으면 모든 값이 기본적으로 체크 해제됨 (포함 방식)
    return false;
  }
  
  const filter = context.storeBridge.filterState.activeFilters.get(colIndex);
  if (!filter) {
    // 필터가 없으면 모든 값이 기본적으로 체크 해제됨 (포함 방식)
    return false;
  }
  
  // 모든 열이 포함 방식으로 동작: 체크된 값들만 보이도록
  // 체크박스가 체크되어 있으면 true, 해제되어 있으면 false
  return filter.values.includes(value);
}

/**
 * 특정 컬럼의 고유한 값들과 각 값의 개수를 반환합니다.
 * 필터가 적용된 경우 필터링된 데이터를 기준으로 계산합니다.
 * @param {number} colIndex - 컬럼 인덱스
 * @param {object} context - 핸들러 컨텍스트
 * @returns {Array} 고유한 값들과 개수의 배열 [{value, count}, ...]
 */
export function getUniqueValuesForColumn(colIndex, context) {
  const { rows, filteredRows, allColumnsMeta } = context;
  const columnMeta = allColumnsMeta.find(c => c.colIndex === colIndex);
  
  console.log('[Filter] getUniqueValuesForColumn 호출:', {
    colIndex,
    columnMeta,
    rowsType: typeof rows,
    rowsValueType: typeof rows?.value,
    rowsLength: rows?.value?.length || rows?.length,
    filteredRowsType: typeof filteredRows,
    filteredRowsValueType: typeof filteredRows?.value,
    filteredRowsLength: filteredRows?.value?.length || filteredRows?.length,
    isFiltered: context.storeBridge?.filterState?.isFiltered
  });
  
  if (!columnMeta || !columnMeta.dataKey) {
    console.log('[Filter] 컬럼 메타데이터 조건 불충족:', {
      hasColumnMeta: !!columnMeta,
      dataKey: columnMeta?.dataKey
    });
    return [];
  }

  // 컨텍스트 메뉴 로직:
  // 1. 현재 컬럼의 필터가 있는 경우: 전체 데이터 기준으로 모든 값 표시
  // 2. 현재 컬럼의 필터가 없는 경우: 다른 컬럼의 필터로 인해 보이는 행들 기준으로 표시
  const allData = rows?.value || rows;
  const filteredData = filteredRows?.value || filteredRows;
  const isFiltered = context.storeBridge?.filterState?.isFiltered;
  const currentColumnFilter = context.storeBridge?.filterState?.activeFilters?.get(colIndex);
  
  console.log('[Filter] 컨텍스트 메뉴 데이터 결정:', {
    isFiltered,
    allDataLength: allData?.length,
    filteredDataLength: filteredData?.length,
    currentColIndex: colIndex,
    hasCurrentColumnFilter: !!currentColumnFilter
  });

  if (!allData || !Array.isArray(allData)) {
    console.log('[Filter] 전체 데이터가 없거나 배열이 아님:', allData);
    return [];
  }

  // 데이터 소스 결정
  const dataToUse = currentColumnFilter ? allData : (isFiltered ? filteredData : allData);
  
  console.log('[Filter] 사용할 데이터 소스:', {
    currentColumnFilter: !!currentColumnFilter,
    dataSource: currentColumnFilter ? 'allData' : (isFiltered ? 'filteredData' : 'allData'),
    dataLength: dataToUse?.length
  });

  if (!dataToUse || !Array.isArray(dataToUse)) {
    console.log('[Filter] 사용할 데이터가 없거나 배열이 아님:', dataToUse);
    return [];
  }

  // 선택된 데이터 소스에서 고유한 값들과 개수 계산
  const valueCounts = new Map();

  dataToUse.forEach((row) => {
    let cellValue = '';
    
    if (columnMeta.cellIndex !== null && columnMeta.cellIndex !== undefined) {
      // 배열 기반 컬럼 (기본정보, 임상증상, 식단)
      if (row[columnMeta.dataKey] && Array.isArray(row[columnMeta.dataKey])) {
        cellValue = String(row[columnMeta.dataKey][columnMeta.cellIndex] ?? '');
      }
    } else {
      // 단일 값 컬럼 (환자여부, 확진여부, 증상발현시간, 개별노출시간)
      cellValue = String(row[columnMeta.dataKey] ?? '');
    }

    // 빈 값 정규화
    if (cellValue === 'null' || cellValue === 'undefined' || cellValue === '') {
      cellValue = '';
    }

    valueCounts.set(cellValue, (valueCounts.get(cellValue) || 0) + 1);
  });

  // 결과 배열 생성
  const result = Array.from(valueCounts.entries())
    .map(([value, count]) => ({ 
      value, 
      count  // 선택된 데이터 소스에서의 개수
    }));

  // 오름차순으로 정렬
  result.sort((a, b) => {
    // 빈 값은 맨 뒤로
    if (a.value === '' && b.value !== '') return 1;
    if (a.value !== '' && b.value === '') return -1;
    
    // 숫자인 경우 숫자 비교
    const aNum = parseFloat(a.value);
    const bNum = parseFloat(b.value);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }
    
    // 문자열인 경우 문자열 비교 (오름차순)
    return a.value.localeCompare(b.value);
  });

  console.log('[Filter] 고유한 값들 계산 완료:', {
    colIndex,
    columnType: columnMeta.type,
    result: result.map(r => `${r.value}(${r.count})`).join(', ')
  });

  return result;
}

/**
 * 특정 날짜/시간 컬럼의 고유한 날짜들과 각 날짜의 개수를 반환합니다.
 * 날짜 부분만 추출하여 그룹화합니다 (시간 제거).
 * @param {number} colIndex - 컬럼 인덱스
 * @param {object} context - 핸들러 컨텍스트
 * @returns {Array} 고유한 날짜들과 개수의 배열 [{date, count}, ...]
 */
export function getUniqueDatesForColumn(colIndex, context) {
  const { rows, filteredRows, allColumnsMeta } = context;
  const columnMeta = allColumnsMeta.find(c => c.colIndex === colIndex);
  
  console.log('[Filter] getUniqueDatesForColumn 호출:', {
    colIndex,
    columnMeta,
    rowsType: typeof rows,
    rowsValueType: typeof rows?.value,
    rowsLength: rows?.value?.length || rows?.length,
    filteredRowsType: typeof filteredRows,
    filteredRowsValueType: typeof filteredRows?.value,
    filteredRowsLength: filteredRows?.value?.length || filteredRows?.length,
    isFiltered: context.storeBridge?.filterState?.isFiltered
  });
  
  if (!columnMeta || !columnMeta.dataKey) {
    console.log('[Filter] 날짜 컬럼 메타데이터 조건 불충족:', {
      hasColumnMeta: !!columnMeta,
      dataKey: columnMeta?.dataKey
    });
    return [];
  }

  // 컨텍스트 메뉴 로직:
  // 1. 현재 컬럼의 필터가 있는 경우: 전체 데이터 기준으로 모든 날짜 표시
  // 2. 현재 컬럼의 필터가 없는 경우: 다른 컬럼의 필터로 인해 보이는 행들 기준으로 표시
  const allData = rows?.value || rows;
  const filteredData = filteredRows?.value || filteredRows;
  const isFiltered = context.storeBridge?.filterState?.isFiltered;
  const currentColumnFilter = context.storeBridge?.filterState?.activeFilters?.get(colIndex);
  
  console.log('[Filter] 날짜 컨텍스트 메뉴 데이터 결정:', {
    isFiltered,
    allDataLength: allData?.length,
    filteredDataLength: filteredData?.length,
    currentColIndex: colIndex,
    hasCurrentColumnFilter: !!currentColumnFilter
  });

  if (!allData || !Array.isArray(allData)) {
    console.log('[Filter] 전체 데이터가 없거나 배열이 아님:', allData);
    return [];
  }

  // 데이터 소스 결정
  const dataToUse = currentColumnFilter ? allData : (isFiltered ? filteredData : allData);
  
  console.log('[Filter] 사용할 날짜 데이터 소스:', {
    currentColumnFilter: !!currentColumnFilter,
    dataSource: currentColumnFilter ? 'allData' : (isFiltered ? 'filteredData' : 'allData'),
    dataLength: dataToUse?.length
  });

  if (!dataToUse || !Array.isArray(dataToUse)) {
    console.log('[Filter] 사용할 날짜 데이터가 없거나 배열이 아님:', dataToUse);
    return [];
  }

  // 날짜 부분 추출 함수
  const extractDatePart = (dateTimeString) => {
    if (!dateTimeString || dateTimeString === '') return '';
    
    // yyyy-mm-dd hh:mm 형식에서 날짜 부분만 추출
    const dateMatch = dateTimeString.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      return dateMatch[1]; // yyyy-mm-dd 부분만 반환
    }
    
    // 다른 형식도 시도 (yyyy/mm/dd 등)
    const altDateMatch = dateTimeString.match(/^(\d{4}[/-]\d{2}[/-]\d{2})/);
    if (altDateMatch) {
      // yyyy/mm/dd를 yyyy-mm-dd로 변환
      return altDateMatch[1].replace(/[/]/g, '-');
    }
    
    return dateTimeString; // 매칭되지 않으면 원본 반환
  };

  // 선택된 데이터 소스에서 고유한 날짜들과 개수 계산
  const dateCounts = new Map();

  dataToUse.forEach((row) => {
    const cellValue = String(row[columnMeta.dataKey] ?? '');
    
    // 빈 값 정규화
    if (cellValue === 'null' || cellValue === 'undefined' || cellValue === '') {
      dateCounts.set('', (dateCounts.get('') || 0) + 1);
      return;
    }

    // 날짜 부분만 추출
    const datePart = extractDatePart(cellValue);
    dateCounts.set(datePart, (dateCounts.get(datePart) || 0) + 1);
  });

  // 결과 배열 생성
  const result = Array.from(dateCounts.entries())
    .map(([date, count]) => ({ 
      date, 
      count  // 선택된 데이터 소스에서의 개수
    }));

  // 날짜 순으로 정렬 (빈 값은 맨 뒤로)
  result.sort((a, b) => {
    // 빈 값은 맨 뒤로
    if (a.date === '' && b.date !== '') return 1;
    if (a.date !== '' && b.date === '') return -1;
    
    // 날짜 비교 (yyyy-mm-dd 형식이므로 문자열 비교로도 정렬됨)
    return a.date.localeCompare(b.date);
  });

  console.log('[Filter] 고유한 날짜들 계산 완료:', {
    colIndex,
    columnType: columnMeta.type,
    result: result.map(r => `${r.date}(${r.count})`).join(', ')
  });

  return result;
}
