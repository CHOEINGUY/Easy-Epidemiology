<template>
  <div class="flex flex-col gap-1.5 min-w-[140px] flex-1">
    <label v-if="label" class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{{ label }}</label>
    <div class="relative group">
      <select 
        :value="modelValue" 
        @input="$emit('update:modelValue', $event.target.value)" 
        class="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 pr-10 hover:border-slate-300"
      >
        <option value="">전체</option>
        <option v-for="option in normalizedOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <span class="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:rotate-180 transition-transform">expand_more</span>
    </div>
  </div>
</template>

<script setup>
import { computed, defineProps, defineEmits } from 'vue';

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  options: { 
    type: Array, 
    default: () => []
    // Can be array of strings or objects { label, value }
  }
});

defineEmits(['update:modelValue']);

const normalizedOptions = computed(() => {
  return props.options.map(opt => {
    if (typeof opt === 'object' && opt !== null && 'value' in opt) {
      return opt;
    }
    return { label: opt, value: opt };
  });
});
</script>
