<template>
  <div class="top-info-wrapper">
    <div class="controls-area">
      <div class="ui-group">
        <label class="ui-label">폰트 크기:</label>
        <div class="control-button-wrapper">
          <button 
            class="control-button" 
            @click="cycleFontSize" 
            @mouseenter="handleFontSizeMouseEnter" 
            @mouseleave="handleFontSizeMouseLeave"
          >
            {{ fontSizeButtonText }}
          </button>
          <div v-if="activeTooltip === 'fontSize'" class="control-tooltip">
            {{ tooltipText }}
          </div>
        </div>
      </div>
    </div>
    <div class="summary-info-area">
      <p>총 {{ rowCount }}명의 데이터 분석</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits } from 'vue';

const props = defineProps({
  fontSize: {
    type: Number,
    required: true
  },
  rowCount: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['update:fontSize']);

const fontSizes = [12, 14, 16];
const fontSizeLabels = ['작게', '보통', '크게'];

const fontSizeButtonText = computed(() => {
  const currentIndex = fontSizes.indexOf(props.fontSize);
  return currentIndex !== -1 ? fontSizeLabels[currentIndex] : '보통';
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
  const nextFontSize = getNextValue(props.fontSize, fontSizes);
  emit('update:fontSize', nextFontSize);
  
  // 툴팁 업데이트를 위해 강제로 다시 계산 (선택사항)
  // handleFontSizeMouseEnter(); // 마우스가 위에 있으므로 바로 갱신하면 좋음
};
</script>

<style scoped>
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

.controls-area {
  display: flex;
  gap: 20px;
}

.summary-info-area {
  font-size: 0.95rem;
  color: #555;
  font-weight: 500;
}

.summary-info-area p {
  margin: 0;
}

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

.control-button-wrapper {
  position: relative;
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

.control-tooltip {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 8px;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 100;
  pointer-events: none;
}

.control-tooltip::after {
  content: "";
  position: absolute;
  bottom: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: transparent transparent rgba(0, 0, 0, 0.8) transparent;
}
</style>
