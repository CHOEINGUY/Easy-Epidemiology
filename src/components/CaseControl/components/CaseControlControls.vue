<template>
  <div class="top-info-wrapper">
    <div class="controls-area">
      <div class="ui-group">
        <label class="ui-label">폰트 크기:</label>
        <div class="control-button-wrapper">
          <button class="control-button" @click="cycleFontSize" @mouseenter="handleFontSizeMouseEnter" @mouseleave="handleFontSizeMouseLeave">
            {{ fontSizeButtonText }}
          </button>
          <div v-if="activeTooltip === 'fontSize'" class="control-tooltip">{{ tooltipText }}</div>
        </div>
      </div>
    </div>
    <div class="summary-info-area">
      <p>총 {{ rowsCount }}명의 데이터 분석</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  rowsCount: {
    type: Number,
    default: 0
  },
  fontSize: {
    type: Number,
    default: 14
  }
});

const emit = defineEmits(['update:fontSize']);

const fontSizes = [12, 14, 16];
const fontSizeLabels = ['작게', '보통', '크게'];

const fontSizeButtonText = computed(() => {
  const index = fontSizes.indexOf(props.fontSize);
  return index !== -1 ? fontSizeLabels[index] : '보통';
});

// 툴팁 상태 관리
const activeTooltip = ref(null);
const tooltipText = ref('');

const showTooltip = (key, text) => {
  activeTooltip.value = key;
  tooltipText.value = text;
};

const hideTooltip = () => {
  activeTooltip.value = null;
};

// 폰트 크기 마우스 이벤트 핸들러
const handleFontSizeMouseEnter = () => {
  const currentIndex = fontSizes.indexOf(props.fontSize);
  const nextIndex = (currentIndex + 1) % fontSizes.length;
  const nextFontSize = fontSizeLabels[nextIndex];
  showTooltip('fontSize', `폰트 크기를 ${nextFontSize}로 변경합니다`);
};

const handleFontSizeMouseLeave = () => {
  hideTooltip();
};

const getNextValue = (currentValue, valueArray) => {
  const currentIndex = valueArray.indexOf(currentValue);
  const nextIndex = (currentIndex + 1) % valueArray.length;
  return valueArray[nextIndex];
};

const cycleFontSize = () => {
  const nextSize = getNextValue(props.fontSize, fontSizes);
  emit('update:fontSize', nextSize);
};
</script>

<style scoped>
/* --- 상단 정보 래퍼 스타일 --- */
.top-info-wrapper {
  display: flex;
  width: 100%;
  box-sizing: border-box; /* Fix width issues with padding */
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
  background-color: transparent;
}

/* --- 입력 컨트롤 영역 스타일 --- */
.controls-area {
  display: flex;
  gap: 20px;
}

/* --- UI 컨트롤 스타일 --- */
.ui-group {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ui-label {
  font-weight: 600;
  color: #333;
  font-size: 0.9rem;
}
.control-button {
  padding: 6px 12px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #495057;
  transition: all 0.2s;
  min-width: 60px;
}
.control-button:hover {
  background-color: #e9ecef;
  border-color: #ced4da;
}

/* --- 요약 정보 영역 스타일 --- */
.summary-info-area {
  font-size: 0.95rem;
  color: #555;
  font-weight: 500;
}
.summary-info-area p {
  margin: 0;
}

/* --- 툴팁 스타일 --- */
.control-button-wrapper {
  position: relative;
  display: inline-block;
}

.control-tooltip {
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  animation: tooltipFadeIn 0.2s ease-in-out;
  font-family: "Noto Sans KR", sans-serif;
}

.control-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #333;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
