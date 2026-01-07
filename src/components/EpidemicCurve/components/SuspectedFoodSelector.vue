<template>
  <div class="suspected-food-input-container">
    <div class="suspected-food-input-wrapper">
      <div class="suspected-food-title">
        <span class="selected-variable-details__title-dot"></span>
        <span style="margin-left: 0.2em;">추정 감염원 선택</span>
        <div class="analysis-status-wrapper">
          <span 
            v-if="analysisStatus" 
            ref="analysisTooltipRef"
            class="analysis-status-badge" 
            :class="analysisStatus.type"
            @mouseenter="showAnalysisTooltip = true"
            @mouseleave="showAnalysisTooltip = false"
          >
            {{ analysisStatus.message }}
          </span>
          <div 
            v-if="showAnalysisTooltip" 
            class="analysis-tooltip"
            :style="analysisTooltipStyle"
          >
            {{ getAnalysisStatusTooltip(analysisStatus) }}
          </div>
        </div>
      </div>
      <div class="suspected-food-dropdown-container">
        <div class="suspected-food-dropdown-wrapper">
          <div ref="dropdownRef" class="unified-food-selector">
            <div class="input-dropdown-trigger" @click="toggleDropdown">
                <input
                  v-model="suspectedFood"
                  type="text"
                  class="unified-food-input"
                  placeholder="추정 감염원을 선택하거나 직접 입력하세요"
                  @input="onSuspectedFoodChange"
                  :disabled="!hasAnalysisResults"
                />
              <span class="dropdown-arrow">▼</span>
            </div>
            
            <div v-if="isDropdownOpen" class="checkbox-dropdown-menu">
              <div class="dropdown-header">
                <span>추정 감염원 선택 (다중 선택 가능)</span>
              </div>
              <div 
                v-for="food in (backgroundAnalysisFoods.length > 0 ? backgroundAnalysisFoods : sortedFoodItems)" 
                :key="food.item"
                class="checkbox-dropdown-item"
                @click="toggleFoodSelection(food.item)"
              >
                <input
                  type="checkbox"
                  :checked="isFoodSelected(food.item)"
                  @click.stop
                  @change="toggleFoodSelection(food.item)"
                  class="food-checkbox"
                />
                <span class="food-name">{{ food.item }}</span>
                <span v-if="food.pValue !== null" class="food-stat">
                  p={{ food.pValue < 0.001 ? '<0.001' : food.pValue.toFixed(3) }}
                  <span v-if="food.oddsRatio && food.oddsRatio !== 'N/A'" class="food-or">
                    (OR: {{ food.oddsRatio }})
                  </span>
                  <span v-else-if="food.relativeRisk && food.relativeRisk !== 'N/A'" class="food-or">
                    (RR: {{ food.relativeRisk }})
                  </span>
                </span>
                <span v-else-if="food.oddsRatio && food.oddsRatio !== 'N/A'" class="food-stat">
                  OR: {{ food.oddsRatio }}
                </span>
                <span v-else-if="food.relativeRisk && food.relativeRisk !== 'N/A'" class="food-stat">
                  RR: {{ food.relativeRisk }}
                </span>
              </div>
              <div class="dropdown-footer">
                <button @click="applySelectedFoods" class="apply-button">닫기</button>
                <button @click="closeDropdown" class="cancel-button">취소</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useSuspectedFood } from '../composables/useSuspectedFood';

const dropdownRef = ref(null);

const {
  suspectedFood,
  isDropdownOpen,
  showAnalysisTooltip,
  analysisTooltipRef,
  hasAnalysisResults,
  sortedFoodItems,
  backgroundAnalysisFoods,
  analysisStatus,
  analysisTooltipStyle,
  getAnalysisStatusTooltip,
  toggleDropdown,
  closeDropdown,
  isFoodSelected,
  toggleFoodSelection,
  applySelectedFoods,
  onSuspectedFoodChange
} = useSuspectedFood();

// 드롭다운 외부 클릭 시 자동 저장 후 닫기
const handleClickOutside = (event) => {
  if (isDropdownOpen.value && dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    applySelectedFoods();
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.suspected-food-input-container {
  margin: 15px 15px 5px 15px;
}

.suspected-food-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.suspected-food-title {
  font-size: 1.1em;
  color: #333;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.selected-variable-details__title-dot { 
  display: inline-block; 
  width: 0.3em; 
  height: 0.3em; 
  background-color: currentColor; 
  margin-right: 0.3em; 
  vertical-align: middle; 
}

.analysis-status-wrapper {
  position: relative;
  display: inline-block;
}

.analysis-status-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  cursor: help;
}

.analysis-status-badge.success {
  background-color: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}

.analysis-status-badge.warning {
  background-color: #fff3e0;
  color: #ef6c00;
  border: 1px solid #ffcc80;
}

.analysis-status-badge.error {
  background-color: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
}

.analysis-tooltip {
  position: fixed;
  background-color: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1050;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.suspected-food-dropdown-container {
  display: flex;
  gap: 10px;
}

.suspected-food-dropdown-wrapper {
  flex: 1;
}

.unified-food-selector {
  position: relative;
}

.input-dropdown-trigger {
  display: flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: white;
  cursor: pointer;
}

.unified-food-input {
  flex: 1;
  border: none;
  padding: 10px 12px;
  font-size: 14px;
  outline: none;
  background: transparent;
  cursor: pointer;
}

.unified-food-input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.dropdown-arrow {
  padding: 0 12px;
  color: #666;
  font-size: 12px;
}

.checkbox-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
}

.dropdown-header {
  padding: 10px 12px;
  background: #f5f5f5;
  border-bottom: 1px solid #eee;
  font-size: 13px;
  font-weight: 500;
  color: #666;
}

.checkbox-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.checkbox-dropdown-item:hover {
  background-color: #f0f7ff;
}

.food-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.food-name {
  flex: 1;
  font-size: 14px;
  text-align: left;
}

.food-stat {
  font-size: 12px;
  color: #666;
  text-align: left;
}

.food-or {
  color: #1a73e8;
  font-weight: 500;
}

.dropdown-footer {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #eee;
  background: #f9f9f9;
}

.apply-button,
.cancel-button {
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.apply-button {
  background: #1a73e8;
  color: white;
  border: none;
}

.apply-button:hover {
  background: #1557b0;
}

.cancel-button {
  background: white;
  color: #666;
  border: 1px solid #ccc;
}

.cancel-button:hover {
  background: #f5f5f5;
}
</style>
