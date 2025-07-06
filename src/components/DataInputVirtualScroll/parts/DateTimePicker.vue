<!-- eslint-disable vue/no-unused-vars -->
<template>
  <div 
    v-if="visible" 
    class="datetime-picker-overlay"
    :style="pickerStyle"
    @click.stop
    @keydown="handleKeyDown"
    tabindex="0"
    ref="pickerRef"
    role="dialog"
    aria-modal="true"
    aria-label="날짜 및 시간 선택"
  >
    <div class="datetime-picker-container">
      <!-- 캘린더 부분 -->
      <div class="calendar-section">
        <div class="month-year-header">
          <button @click="prevMonth" class="nav-btn">‹</button>
          
          <div class="date-selectors">
            <select v-model="currentYear" class="year-select">
              <option v-for="year in availableYears" :key="year" :value="year"
                      :class="{ 'current-year': year === new Date().getFullYear() }">
                {{ year }}년
              </option>
            </select>
            
            <select v-model="currentMonth" class="month-select">
              <option v-for="m in 12" :key="m" :value="m">{{ m }}월</option>
            </select>
          </div>
          
          <button @click="nextMonth" class="nav-btn">›</button>
        </div>
        
        <!-- 요일 헤더 -->
        <div class="weekday-header">
          <span v-for="day in weekdays" :key="day" class="weekday">{{ day }}</span>
        </div>
        
        <!-- 날짜 그리드 -->
        <div 
          class="date-grid"
          role="grid"
          aria-label="달력"
        >
          <button 
            v-for="date in calendarDates" 
            :key="date.key"
            :class="getDateClass(date)"
            @click="selectDate(date)"
            :disabled="date.disabled"
            role="gridcell"
            :aria-label="`${date.year}년 ${date.month}월 ${date.day}일`"
            :aria-selected="selectedDate.year === date.year && selectedDate.month === date.month && selectedDate.day === date.day"
            :tabindex="focusedDate.year === date.year && focusedDate.month === date.month && focusedDate.day === date.day ? '0' : '-1'"
          >
            {{ date.day }}
          </button>
        </div>
      </div>
      
      <!-- 시간 선택 부분 -->
      <div class="time-section">
        <div class="time-header">
          <span>시간 선택</span>
        </div>
        
        <div class="time-content">
          <div class="time-inputs">
            <div class="time-input-group">
              <label for="hour-select">시</label>
              <select 
                id="hour-select"
                v-model="selectedHour" 
                class="time-select"
                aria-label="시간 선택"
              >
                <option v-for="h in 24" :key="h-1" :value="String(h-1).padStart(2, '0')">
                  {{ String(h-1).padStart(2, '0') }}
                </option>
              </select>
            </div>
            
            <div class="time-separator">:</div>
            
            <div class="time-input-group">
              <label for="minute-select">분</label>
              <select 
                id="minute-select"
                v-model="selectedMinute" 
                class="time-select"
                aria-label="분 선택"
              >
                <option v-for="m in 12" :key="m-1" :value="String((m-1) * 5).padStart(2, '0')">
                  {{ String((m-1) * 5).padStart(2, '0') }}
                </option>
              </select>
            </div>
          </div>
          
          <!-- 직접 입력 필드 -->
          <div class="direct-input-section">
            <div class="input-header">
              <span>직접 입력</span>
            </div>
            <div class="input-field">
              <input
                ref="directInputRef"
                v-model="directInputValue"
                type="text"
                class="datetime-input"
                placeholder="YYYY-MM-DD HH:MM"
                @keydown="handleDirectInputKeydown"
                @input="handleDirectInput"
                @blur="handleDirectInputBlur"
                @focus="handleDirectInputFocus"
              />
            </div>
          </div>
        </div>
        
        <div class="bottom-section">
          <div class="current-selection">
            <div class="selection-display">
              {{ formatCurrentSelection() }}
            </div>
          </div>
          
          <div class="action-buttons">
            <button @click="cancel" class="cancel-btn">취소</button>
            <button @click="confirm" class="confirm-btn">확인</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue';

// Vue 3 setup script에서 컴파일러 매크로 사용
// eslint-disable-next-line no-undef
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  position: {
    type: Object,
    default: () => ({ top: 0, left: 0 })
  },
  initialValue: {
    type: Object,
    default: null
  }
});

// eslint-disable-next-line no-undef
const emit = defineEmits(['confirm', 'cancel', 'update:visible']);

const pickerRef = ref(null);

// 현재 선택된 날짜와 시간
const selectedDate = reactive({
  year: null,
  month: null,
  day: null
});

const selectedHour = ref('00');
const selectedMinute = ref('00');

// 직접 입력 관련
const directInputRef = ref(null);
const directInputValue = ref('');

// 키보드 포커스된 날짜 (키보드 네비게이션용)
const focusedDate = reactive({
  year: null,
  month: null,
  day: null
});

// 캘린더 표시용 현재 년/월
const currentYear = ref(new Date().getFullYear());
const currentMonth = ref(new Date().getMonth() + 1);

// 요일 배열
const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

// 피커 스타일
const pickerStyle = computed(() => ({
  top: `${props.position.top}px`,
  left: `${props.position.left}px`
}));

// 연도 범위 (현재 연도 기준 과거 5년)
const availableYears = computed(() => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear - 5; year <= currentYear; year++) {
    years.push(year);
  }
  return years;
});

// 캘린더 날짜 생성
const calendarDates = computed(() => {
  const dates = [];
  const year = currentYear.value;
  const month = currentMonth.value;
  
  // 첫 번째 날의 요일 (0: 일요일, 6: 토요일)
  const firstDay = new Date(year, month - 1, 1).getDay();
  
  // 이전 달의 마지막 날
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonthLastDate = new Date(prevYear, prevMonth, 0).getDate();
  
  // 현재 달의 마지막 날
  const currentMonthLastDate = new Date(year, month, 0).getDate();
  
  // 이전 달의 마지막 주 날짜들
  for (let i = firstDay - 1; i >= 0; i--) {
    dates.push({
      key: `prev-${prevMonthLastDate - i}`,
      day: prevMonthLastDate - i,
      year: prevYear,
      month: prevMonth,
      disabled: true,
      isPrevMonth: true
    });
  }
  
  // 현재 달의 날짜들
  for (let day = 1; day <= currentMonthLastDate; day++) {
    dates.push({
      key: `current-${day}`,
      day,
      year,
      month,
      disabled: false,
      isCurrentMonth: true
    });
  }
  
  // 다음 달의 첫 주 날짜들 (총 42칸 맞추기)
  const remainingCells = 42 - dates.length;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  
  for (let day = 1; day <= remainingCells; day++) {
    dates.push({
      key: `next-${day}`,
      day,
      year: nextYear,
      month: nextMonth,
      disabled: true,
      isNextMonth: true
    });
  }
  
  return dates;
});

// 날짜 클래스 계산
const getDateClass = (date) => {
  const classes = ['date-cell'];
  
  if (date.disabled) {
    classes.push('disabled');
  }
  
  if (date.isCurrentMonth) {
    classes.push('current-month');
  }
  
  if (selectedDate.year === date.year && 
      selectedDate.month === date.month && 
      selectedDate.day === date.day) {
    classes.push('selected');
  }
  
  // 키보드 포커스된 날짜 표시
  if (focusedDate.year === date.year && 
      focusedDate.month === date.month && 
      focusedDate.day === date.day) {
    classes.push('focused');
  }
  
  // 오늘 날짜 표시
  const today = new Date();
  if (date.year === today.getFullYear() && 
      date.month === today.getMonth() + 1 && 
      date.day === today.getDate()) {
    classes.push('today');
  }
  
  return classes;
};

// 월 이동
const prevMonth = () => {
  if (currentMonth.value === 1) {
    currentMonth.value = 12;
    currentYear.value--;
  } else {
    currentMonth.value--;
  }
};

const nextMonth = () => {
  if (currentMonth.value === 12) {
    currentMonth.value = 1;
    currentYear.value++;
  } else {
    currentMonth.value++;
  }
};

// 날짜 선택
const selectDate = (date) => {
  if (date.disabled) return;
  
  selectedDate.year = date.year;
  selectedDate.month = date.month;
  selectedDate.day = date.day;

  // 선택한 날짜와 키보드 포커스 동기화
  focusedDate.year = date.year;
  focusedDate.month = date.month;
  focusedDate.day = date.day;
  
  // 선택한 날짜가 다른 달이면 해당 달로 이동
  if (!date.isCurrentMonth) {
    currentYear.value = date.year;
    currentMonth.value = date.month;
  }
};

// 현재 선택 상태 포맷
const formatCurrentSelection = () => {
  if (!selectedDate.year || !selectedDate.month || !selectedDate.day) {
    return '날짜를 선택하세요';
  }
  
  const year = selectedDate.year;
  const month = String(selectedDate.month).padStart(2, '0');
  const day = String(selectedDate.day).padStart(2, '0');
  
  return `${year}-${month}-${day} ${selectedHour.value}:${selectedMinute.value}`;
};

// 키보드 이벤트 처리
const handleKeyDown = (event) => {
  switch(event.key) {
  case 'Escape':
    event.preventDefault();
    event.stopPropagation();
    cancel();
    break;
  case 'Enter':
    event.preventDefault();
    event.stopPropagation();
    confirm();
    break;
  case 'Tab':
    // Tab 키는 데이트피커 내부 요소 간 이동을 위해 기본 동작 허용
    break;
  case 'ArrowLeft':
    // 캘린더에서 왼쪽 날짜로 이동
    event.preventDefault();
    navigateDate('left');
    break;
  case 'ArrowRight':
    // 캘린더에서 오른쪽 날짜로 이동
    event.preventDefault();
    navigateDate('right');
    break;
  case 'ArrowUp':
    // 캘린더에서 위쪽 날짜로 이동
    event.preventDefault();
    navigateDate('up');
    break;
  case 'ArrowDown':
    // 캘린더에서 아래쪽 날짜로 이동
    event.preventDefault();
    navigateDate('down');
    break;
  case 'Home':
    // 월의 첫 번째 날로 이동
    event.preventDefault();
    navigateToFirstDay();
    break;
  case 'End':
    // 월의 마지막 날로 이동
    event.preventDefault();
    navigateToLastDay();
    break;
  case 'PageUp':
    // 이전 달로 이동
    event.preventDefault();
    if (event.shiftKey) {
      // Shift + PageUp: 이전 해로 이동
      navigateYear(-1);
    } else {
      prevMonth();
    }
    break;
  case 'PageDown':
    // 다음 달로 이동
    event.preventDefault();
    if (event.shiftKey) {
      // Shift + PageDown: 다음 해로 이동
      navigateYear(1);
    } else {
      nextMonth();
    }
    break;
  case ' ':
    // 스페이스바: 현재 포커스된 날짜 선택
    event.preventDefault();
    selectFocusedDate();
    break;
  }
};

// 확인 버튼
const confirm = () => {
  if (!selectedDate.year || !selectedDate.month || !selectedDate.day) {
    alert('날짜를 선택해주세요.');
    return;
  }
  
  const result = {
    year: selectedDate.year,
    month: selectedDate.month,
    day: selectedDate.day,
    hour: selectedHour.value,
    minute: selectedMinute.value
  };
  
  emit('confirm', result);
};

// 취소 버튼
const cancel = () => {
  emit('cancel');
};

// 초기값 설정
watch(() => props.initialValue, (newValue) => {
  if (newValue) {
    selectedDate.year = newValue.year;
    selectedDate.month = newValue.month;
    selectedDate.day = newValue.day;
    selectedHour.value = newValue.hour || '00';
    // 분을 5분 단위로 반올림
    const minuteValue = newValue.minute || '00';
    const minuteNum = parseInt(minuteValue);
    selectedMinute.value = String(minuteNum).padStart(2, '0');
    
    // 캘린더도 해당 년/월로 이동
    currentYear.value = newValue.year;
    currentMonth.value = newValue.month;
    
    // 포커스된 날짜도 설정
    focusedDate.year = newValue.year;
    focusedDate.month = newValue.month;
    focusedDate.day = newValue.day;
    
    // 직접 입력 필드 초기화
    directInputValue.value = formatCurrentSelection();
  } else {
    // 초기값이 없으면 현재 날짜/시간으로 설정
    const now = new Date();
    selectedDate.year = now.getFullYear();
    selectedDate.month = now.getMonth() + 1;
    selectedDate.day = now.getDate();
    selectedHour.value = String(now.getHours()).padStart(2, '0');
    // 현재 분을 5분 단위로 반올림
    selectedMinute.value = String(now.getMinutes()).padStart(2, '0');
    
    currentYear.value = now.getFullYear();
    currentMonth.value = now.getMonth() + 1;
    
    // 포커스된 날짜도 설정
    focusedDate.year = now.getFullYear();
    focusedDate.month = now.getMonth() + 1;
    focusedDate.day = now.getDate();
    
    // 직접 입력 필드 초기화
    directInputValue.value = formatCurrentSelection();
  }
}, { immediate: true });

// 피커가 보여질 때 포커스 설정
watch(() => props.visible, (visible) => {
  if (visible) {
    nextTick(() => {
      // pickerRef 포커스를 주지 않아 셀 입력을 가능하게 함
    });
  }
});

// 선택된 날짜나 시간이 변경될 때 직접 입력 필드 업데이트
watch([selectedDate, selectedHour, selectedMinute], () => {
  directInputValue.value = formatCurrentSelection();
}, { deep: true });

// --- 키보드 네비게이션 함수들 ---

// 날짜 네비게이션
const navigateDate = (direction) => {
  // 포커스된 날짜가 없으면 선택된 날짜 또는 오늘 날짜로 초기화
  if (!focusedDate.year || !focusedDate.month || !focusedDate.day) {
    if (selectedDate.year && selectedDate.month && selectedDate.day) {
      focusedDate.year = selectedDate.year;
      focusedDate.month = selectedDate.month;
      focusedDate.day = selectedDate.day;
    } else {
      const today = new Date();
      focusedDate.year = today.getFullYear();
      focusedDate.month = today.getMonth() + 1;
      focusedDate.day = today.getDate();
    }
  }
  
  const currentDate = new Date(focusedDate.year, focusedDate.month - 1, focusedDate.day);
  
  switch (direction) {
  case 'left':
    currentDate.setDate(currentDate.getDate() - 1);
    break;
  case 'right':
    currentDate.setDate(currentDate.getDate() + 1);
    break;
  case 'up':
    currentDate.setDate(currentDate.getDate() - 7);
    break;
  case 'down':
    currentDate.setDate(currentDate.getDate() + 7);
    break;
  }
  
  focusedDate.year = currentDate.getFullYear();
  focusedDate.month = currentDate.getMonth() + 1;
  focusedDate.day = currentDate.getDate();
  
  // 포커스된 날짜가 다른 달이면 해당 달로 이동
  if (focusedDate.month !== currentMonth.value || focusedDate.year !== currentYear.value) {
    currentYear.value = focusedDate.year;
    currentMonth.value = focusedDate.month;
  }
};

// 년도 이동
const navigateYear = (delta) => {
  currentYear.value += delta;
};

// 월의 첫 번째 날로 이동
const navigateToFirstDay = () => {
  focusedDate.year = currentYear.value;
  focusedDate.month = currentMonth.value;
  focusedDate.day = 1;
};

// 월의 마지막 날로 이동
const navigateToLastDay = () => {
  const lastDay = new Date(currentYear.value, currentMonth.value, 0).getDate();
  focusedDate.year = currentYear.value;
  focusedDate.month = currentMonth.value;
  focusedDate.day = lastDay;
};

// 현재 포커스된 날짜 선택
const selectFocusedDate = () => {
  if (focusedDate.year && focusedDate.month && focusedDate.day) {
    selectedDate.year = focusedDate.year;
    selectedDate.month = focusedDate.month;
    selectedDate.day = focusedDate.day;
  }
};

// --- 직접 입력 관련 함수들 ---

// 직접 입력 처리
const handleDirectInput = () => {
  const value = directInputValue.value;
  if (!value) return;
  
  // YYYY-MM-DD HH:MM 형식 파싱
  const regex = /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})$/;
  const match = value.match(regex);
  
  if (match) {
    const [, year, month, day, hour, minute] = match;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    const hourNum = parseInt(hour);
    const minuteNum = parseInt(minute);
    
    // 유효한 날짜인지 확인
    const date = new Date(yearNum, monthNum - 1, dayNum);
    if (date.getFullYear() === yearNum && 
        date.getMonth() === monthNum - 1 && 
        date.getDate() === dayNum &&
        hourNum >= 0 && hourNum <= 23 &&
        minuteNum >= 0 && minuteNum <= 59) {
      
      // 선택된 날짜와 시간 업데이트
      selectedDate.year = yearNum;
      selectedDate.month = monthNum;
      selectedDate.day = dayNum;
      selectedHour.value = String(hourNum).padStart(2, '0');
      // 분을 더 이상 5분 단위로 반올림하지 않고 그대로 사용
      selectedMinute.value = String(minuteNum).padStart(2, '0');
      
      // 캘린더도 해당 날짜로 이동
      currentYear.value = yearNum;
      currentMonth.value = monthNum;
      
      // 포커스된 날짜도 업데이트
      focusedDate.year = yearNum;
      focusedDate.month = monthNum;
      focusedDate.day = dayNum;
    }
  }
};

// 직접 입력 키보드 처리
const handleDirectInputKeydown = (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleDirectInput();
    confirm();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancel();
  } else if (event.key === 'Tab') {
    // Tab 키는 기본 동작 허용 (다음 요소로 이동)
    return;
  }
  // 다른 키는 기본 동작 허용 (타이핑 가능)
};

// 직접 입력 포커스 아웃 처리
const handleDirectInputBlur = () => {
  // 약간의 지연 후 처리 (다른 요소로 포커스 이동 시)
  setTimeout(() => {
    handleDirectInput();
  }, 150);
};

// 직접 입력 포커스 인 처리
const handleDirectInputFocus = () => {
  // 포커스 인 시 직접 입력 필드 업데이트
  directInputValue.value = formatCurrentSelection();
};

// 부모 컴포넌트에서 confirm / cancel 메서드에 접근할 수 있도록 노출
// eslint-disable-next-line no-undef
defineExpose({ confirm, cancel });
</script>

<style scoped>
.datetime-picker-overlay {
  position: fixed;
  z-index: 9999;
  background: white;
  border: 1px solid #ddd;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  outline: none;
  user-select: none;
}

.datetime-picker-container {
  display: flex;
  min-width: 450px;
  max-width: 600px;
}

.calendar-section {
  flex: 1;
  padding: 20px;
  border-right: 1px solid #eee;
}

.month-year-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.nav-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.nav-btn:hover {
  background-color: #f5f5f5;
}

.year-month-display {
  font-weight: 600;
  font-size: 16px;
  color: #333;
}

.date-selectors {
  display: flex;
  gap: 8px;
  align-items: center;
}

.month-select, .year-select {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  min-width: 60px;
}

.month-select:focus, .year-select:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.month-select:hover, .year-select:hover {
  border-color: #1976d2;
}

/* 현재 연도 하이라이트 */
.year-select option.current-year {
  background-color: #e3f2fd;
  color: #1976d2;
  font-weight: 600;
}

.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.weekday {
  text-align: center;
  font-size: 14px;
  color: #666;
  padding: 8px 4px;
  font-weight: 500;
}

.date-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.date-cell {
  background: none;
  border: none;
  padding: 10px 4px;
  cursor: pointer;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.date-cell.current-month {
  color: #333;
}

.date-cell.disabled {
  color: #ccc;
  cursor: not-allowed;
}

.date-cell.today {
  background-color: #e3f2fd;
  color: #1976d2;
  font-weight: 600;
}

.date-cell.selected {
  background-color: #1976d2;
  color: white;
  font-weight: 600;
}

.date-cell.focused {
  outline: 2px solid #1976d2;
  outline-offset: -2px;
  z-index: 1;
}

.date-cell.selected.focused {
  outline: 2px solid white;
  outline-offset: -2px;
}

.date-cell:hover:not(.disabled):not(.selected) {
  background-color: #f5f5f5;
}

.time-section {
  width: 180px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.time-content {
  flex: 1;
}

.bottom-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.time-header {
  font-weight: 600;
  margin-bottom: 16px;
  color: #333;
}

.time-inputs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
}

.time-input-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.time-input-group label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  font-family: 'Noto Sans KR', sans-serif;
}

.time-select {
  padding: 8px 6px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  width: 60px;
  font-family: 'Noto Sans KR', sans-serif;
}

.time-select:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.time-separator {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-top: 16px;
  font-family: 'Noto Sans KR', sans-serif;
}

.current-selection {
  display: flex;
  align-items: center;
  justify-content: center;
}

.selection-display {
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 8px;
  font-size: 15px;
  font-family: 'Noto Sans KR', sans-serif;
  color: #495057;
  border: 1px solid #e9ecef;
  width: 100%;
  text-align: center;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.direct-input-section {
  display: none;
}

.input-header {
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
  font-size: 14px;
}

.input-field {
  margin-bottom: 12px;
}

.datetime-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-family: 'Noto Sans KR', sans-serif;
  background: white;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.datetime-input:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.datetime-input:hover {
  border-color: #1976d2;
}

.datetime-input::placeholder {
  color: #999;
  font-family: inherit;
}

.cancel-btn, .confirm-btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.cancel-btn {
  background-color: #f5f5f5;
  color: #333;
}

.cancel-btn:hover {
  background-color: #e9ecef;
}

.confirm-btn {
  background-color: #1976d2;
  color: white;
}

.confirm-btn:hover {
  background-color: #1565c0;
}

.confirm-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style> 