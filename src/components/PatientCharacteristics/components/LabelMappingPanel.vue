<template>
  <div class="p-5 border-t border-slate-100 bg-slate-50/50 h-auto">
    <div class="flex items-center text-slate-700 font-semibold mb-4">
      <span class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></span>
      라벨 매핑
    </div>
    
    <div v-if="categories.length > 0" class="flex flex-col gap-3">
      <div v-for="category in categories" :key="category" class="grid grid-cols-[auto_1fr] items-center gap-3">
        <span class="text-sm font-medium text-slate-600 min-w-[80px] break-keep">{{ category }} :</span>
        <input 
          type="text" 
          :value="modelValue[category] || ''" 
          @change="handleChange(category, $event.target.value)"
          placeholder="차트에 표시될 새 라벨" 
          class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400 placeholder:italic placeholder:text-xs" 
        />
      </div>
    </div>
    <div v-else class="text-sm text-slate-400 italic py-2">
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
