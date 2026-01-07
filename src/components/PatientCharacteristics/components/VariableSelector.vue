<template>
  <div class="variable-selection">
    <button 
      v-for="(header, index) in headers" 
      :key="index" 
      @click="$emit('select', index)" 
      :class="{ 'variable-selection__button--active': selectedIndex === index }" 
      class="variable-selection__button"
    >
      {{ header === "" ? "(없음)" : header }}
    </button>
  </div>
</template>

<script setup>
// VariableSelector.vue - 변수 선택 버튼 컴포넌트
defineProps({
  headers: {
    type: Array,
    required: true
  },
  selectedIndex: {
    type: Number,
    default: null
  }
});

defineEmits(['select']);
</script>

<style scoped>
.variable-selection { 
  display: flex; 
  gap: 20px; 
  justify-content: flex-start; 
  flex-wrap: wrap; 
  height: 46px; 
}

.variable-selection__button { 
  padding: 5px 15px; 
  border: 1px solid #ccc; 
  border-radius: 12px; 
  background-color: white; 
  cursor: pointer; 
  font-family: "Noto Sans KR", sans-serif; 
  font-size: 20px; 
}

.variable-selection__button--active { 
  background-color: #1a73e8; 
  color: white; 
  border-color: #1a73e8; 
}
</style>
