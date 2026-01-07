<!-- TimePicker.vue -->
<template>
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
            :value="hour"
            @change="$emit('update:hour', $event.target.value)"
            class="time-select"
            aria-label="시간 선택"
            @click.stop
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
            :value="minute"
            @change="$emit('update:minute', $event.target.value)"
            class="time-select"
            aria-label="분 선택"
            @click.stop
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
            @click.stop
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
        <button @click.stop="$emit('cancel')" class="cancel-btn">취소</button>
        <button @click.stop="confirm" class="confirm-btn">확인</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

// eslint-disable-next-line no-undef
const props = defineProps({
  year: Number,
  month: Number,
  day: Number,
  hour: String,
  minute: String
});

// eslint-disable-next-line no-undef
const emit = defineEmits([
  'update:year', 
  'update:month', 
  'update:day', 
  'update:hour', 
  'update:minute', 
  'confirm', 
  'cancel'
]);

const directInputRef = ref(null);
const directInputValue = ref('');

// 현재 선택 상태 포맷
const formatCurrentSelection = () => {
  if (!props.year || !props.month || !props.day) {
    return '날짜를 선택하세요';
  }
  
  const formattedYear = props.year;
  const formattedMonth = String(props.month).padStart(2, '0');
  const formattedDay = String(props.day).padStart(2, '0');
  
  return `${formattedYear}-${formattedMonth}-${formattedDay} ${props.hour}:${props.minute}`;
};

// 확인 버튼
const confirm = () => {
  if (!props.year || !props.month || !props.day) {
    alert('날짜를 선택해주세요.');
    return;
  }
  emit('confirm');
};

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
      emit('update:year', yearNum);
      emit('update:month', monthNum);
      emit('update:day', dayNum);
      emit('update:hour', String(hourNum).padStart(2, '0'));
      emit('update:minute', String(minuteNum).padStart(2, '0'));
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
    emit('cancel');
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

// 선택된 날짜나 시간이 변경될 때 직접 입력 필드 업데이트
watch(
  () => [props.year, props.month, props.day, props.hour, props.minute],
  () => {
    // 입력 필드에 포커스가 없을 때만 업데이트하여 입력 중 방해 방지
    if (document.activeElement !== directInputRef.value) {
      directInputValue.value = formatCurrentSelection();
    }
  },
  { deep: true, immediate: true }
);
</script>

<style scoped>
.time-section {
  width: 180px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.time-header {
  font-weight: 600;
  margin-bottom: 16px;
  color: #333;
}

.time-content {
  flex: 1;
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

.bottom-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
</style>
