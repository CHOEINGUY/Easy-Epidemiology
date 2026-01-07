<template>
  <div class="mapping-container">
    <div class="mapping-title">
      <span class="selected-variable-details__title-dot"></span>&nbsp;라벨 매핑
    </div>
    <div v-if="categories.length > 0" class="mapping-items">
      <div v-for="category in categories" :key="category" class="mapping-item">
        <span class="mapping-original-label">{{ category }} :</span>
        <input 
          type="text" 
          :value="modelValue[category] || ''" 
          @change="handleChange(category, $event.target.value)"
          placeholder="차트에 표시될 새 라벨" 
          class="mapping-input" 
        />
      </div>
    </div>
    <div v-else class="mapping-nodata">
      매핑할 카테고리가 없습니다.
    </div>
  </div>
</template>

<script setup>
// LabelMappingPanel.vue - 라벨 매핑 컴포넌트
const props = defineProps({
  categories: {
    type: Array,
    required: true
  },
  modelValue: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const handleChange = (category, value) => {
  const newMappings = { ...props.modelValue, [category]: value };
  emit('update:modelValue', newMappings);
  emit('change');
};
</script>

<style scoped>
.mapping-container {
  padding: 15px 20px;
  margin: 0px 0px 10px 0px;
  border-top: 1px solid #eee;
  background-color: #fff;
  max-height: 300px;
  overflow-y: auto;
  box-sizing: border-box;
}

.mapping-title { 
  margin: 0px 10px 20px 0px; 
  font-size: 1.1em; 
  color: #333; 
  font-weight: 500; 
  text-align: left; 
  display: flex; 
  align-items: center; 
}

.mapping-items {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.mapping-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mapping-original-label {
  font-size: 14px;
  white-space: nowrap;
  text-align: left;
  font-weight: 500;
}

.mapping-input {
  max-width: 300px;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.85rem;
  line-height: 1.4;
  box-sizing: border-box;
}

.mapping-input::placeholder {
  color: #aaa;
  font-style: italic;
  font-size: 0.8rem;
}

.mapping-input:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
}

.mapping-nodata {
  font-size: 0.85rem;
  color: #888;
  text-align: left;
  padding: 15px 0;
}

.selected-variable-details__title-dot { 
  display: inline-block; 
  width: 0.3em; 
  height: 0.3em; 
  background-color: currentColor; 
  margin-right: 0.3em; 
  vertical-align: middle; 
}
</style>
