<!-- CalendarPicker.vue -->
<template>
  <div class="calendar-section">
    <div class="month-year-header">
      <button @click.stop="prevMonth" class="nav-btn">‹</button>
      
      <div class="date-selectors">
        <select v-model="currentYear" class="year-select" @click.stop>
          <option v-for="year in availableYears" :key="year" :value="year"
                  :class="{ 'current-year': year === new Date().getFullYear() }">
            {{ year }}년
          </option>
        </select>
        
        <select v-model="currentMonth" class="month-select" @click.stop>
          <option v-for="m in 12" :key="m" :value="m">{{ m }}월</option>
        </select>
      </div>
      
      <button @click.stop="nextMonth" class="nav-btn">›</button>
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
        @click.stop="selectDate(date)"
        :disabled="date.disabled"
        role="gridcell"
        :aria-label="`${date.year}년 ${date.month}월 ${date.day}일`"
        :aria-selected="isSelected(date)"
        :tabindex="isFocused(date) ? '0' : '-1'"
      >
        {{ date.day }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';

// eslint-disable-next-line no-undef
const props = defineProps({
  year: {
    type: Number,
    default: null
  },
  month: {
    type: Number,
    default: null
  },
  day: {
    type: Number,
    default: null
  }
});

// eslint-disable-next-line no-undef
const emit = defineEmits(['update:year', 'update:month', 'update:day', 'select']);

// 캘린더 표시용 현재 년/월
const currentYear = ref(new Date().getFullYear());
const currentMonth = ref(new Date().getMonth() + 1);

// 키보드 포커스된 날짜 (내부 상태)
const focusedDate = reactive({
  year: null,
  month: null,
  day: null
});

// 요일 배열
const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

// 연도 범위 (현재 연도 기준 과거 5년)
const availableYears = computed(() => {
  const cYear = new Date().getFullYear();
  const years = [];
  for (let y = cYear - 5; y <= cYear; y++) {
    years.push(y);
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
  const prevMonthNum = month === 1 ? 12 : month - 1;
  const prevYearNum = month === 1 ? year - 1 : year;
  const prevMonthLastDate = new Date(prevYearNum, prevMonthNum, 0).getDate();
  
  // 현재 달의 마지막 날
  const currentMonthLastDate = new Date(year, month, 0).getDate();
  
  // 이전 달의 마지막 주 날짜들
  for (let i = firstDay - 1; i >= 0; i--) {
    dates.push({
      key: `prev-${prevMonthLastDate - i}`,
      day: prevMonthLastDate - i,
      year: prevYearNum,
      month: prevMonthNum,
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
  const nextMonthNum = month === 12 ? 1 : month + 1;
  const nextYearNum = month === 12 ? year + 1 : year;
  
  for (let day = 1; day <= remainingCells; day++) {
    dates.push({
      key: `next-${day}`,
      day,
      year: nextYearNum,
      month: nextMonthNum,
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
  
  if (isSelected(date)) {
    classes.push('selected');
  }
  
  // 키보드 포커스된 날짜 표시
  if (isFocused(date)) {
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

const isSelected = (date) => {
  return props.year === date.year && 
         props.month === date.month && 
         props.day === date.day;
};

const isFocused = (date) => {
  return focusedDate.year === date.year && 
         focusedDate.month === date.month && 
         focusedDate.day === date.day;
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
  
  emit('update:year', date.year);
  emit('update:month', date.month);
  emit('update:day', date.day);
  emit('select', date);
  
  // 선택한 날짜와 포커스 동기화
  focusedDate.year = date.year;
  focusedDate.month = date.month;
  focusedDate.day = date.day;
  
  // 선택한 날짜가 다른 달이면 해당 달로 이동
  if (!date.isCurrentMonth) {
    currentYear.value = date.year;
    currentMonth.value = date.month;
  }
};

// --- 키보드 네비게이션 ---

const handleKeyDown = (event) => {
  switch(event.key) {
  case 'ArrowLeft':
    event.preventDefault();
    navigateDate('left');
    break;
  case 'ArrowRight':
    event.preventDefault();
    navigateDate('right');
    break;
  case 'ArrowUp':
    event.preventDefault();
    navigateDate('up');
    break;
  case 'ArrowDown':
    event.preventDefault();
    navigateDate('down');
    break;
  case 'Home':
    event.preventDefault();
    navigateToFirstDay();
    break;
  case 'End':
    event.preventDefault();
    navigateToLastDay();
    break;
  case 'PageUp':
    event.preventDefault();
    if (event.shiftKey) {
      navigateYear(-1);
    } else {
      prevMonth();
    }
    break;
  case 'PageDown':
    event.preventDefault();
    if (event.shiftKey) {
      navigateYear(1);
    } else {
      nextMonth();
    }
    break;
  case ' ': // Spacebar
    event.preventDefault();
    selectFocusedDate();
    break;
  }
};

const navigateDate = (direction) => {
  if (!focusedDate.year || !focusedDate.month || !focusedDate.day) {
    // 초기화
    if (props.year && props.month && props.day) {
      focusedDate.year = props.year;
      focusedDate.month = props.month;
      focusedDate.day = props.day;
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
  
  // 뷰 동기화
  if (focusedDate.month !== currentMonth.value || focusedDate.year !== currentYear.value) {
    currentYear.value = focusedDate.year;
    currentMonth.value = focusedDate.month;
  }
};

const navigateYear = (delta) => {
  currentYear.value += delta;
};

const navigateToFirstDay = () => {
  focusedDate.year = currentYear.value;
  focusedDate.month = currentMonth.value;
  focusedDate.day = 1;
};

const navigateToLastDay = () => {
  const lastDay = new Date(currentYear.value, currentMonth.value, 0).getDate();
  focusedDate.year = currentYear.value;
  focusedDate.month = currentMonth.value;
  focusedDate.day = lastDay;
};

const selectFocusedDate = () => {
  if (focusedDate.year && focusedDate.month && focusedDate.day) {
    selectDate({
      year: focusedDate.year,
      month: focusedDate.month,
      day: focusedDate.day,
      isCurrentMonth: true // 이 부분은 단순 플래그로 사용
    });
  }
};

// 외부 Watchers
watch(() => [props.year, props.month, props.day], ([newY, newM, newD]) => {
  if (newY && newM && newD) {
    focusedDate.year = newY;
    focusedDate.month = newM;
    focusedDate.day = newD;
    
    currentYear.value = newY;
    currentMonth.value = newM;
  } else {
    // 값이 없으면 오늘 날짜로 초기화
    const now = new Date();
    focusedDate.year = now.getFullYear();
    focusedDate.month = now.getMonth() + 1;
    focusedDate.day = now.getDate();
    
    currentYear.value = now.getFullYear();
    currentMonth.value = now.getMonth() + 1;
  }
}, { immediate: true });

// eslint-disable-next-line no-undef
defineExpose({
  handleKeyDown,
  prevMonth,
  nextMonth
});
</script>

<style scoped>
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
</style>
