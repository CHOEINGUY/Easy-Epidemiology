<template>
  <div class="flex items-center gap-2">
    <span v-if="label" class="text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ label }}</span>
    <div class="relative group">
      <button 
        class="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm hover:border-blue-400 hover:text-blue-600 transition-colors"
        :class="minWidthClass"
        @click="cycleValue" 
        @mouseenter="handleMouseEnter" 
        @mouseleave="handleMouseLeave"
      > 
        {{ buttonText }} 
      </button>
      <transition enter-active-class="transition ease-out duration-200" enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition ease-in duration-150" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-1">
        <div v-if="isTooltipVisible" class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-2 rounded shadow-lg text-xs whitespace-nowrap z-50">
          {{ tooltipMessage }}
          <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  label: {
    type: String,
    default: ''
  },
  modelValue: {
    type: [Number, String],
    required: true
  },
  options: {
    type: Array,
    required: true
    // Expected format: Array of values [12, 15] OR Array of Objects [{ value: 'v', label: 'l', tooltip: 't' }]
  },
  displayLabels: {
    type: Array, // Optional: separate labels if options are just values
    default: () => []
  },
  tooltipPrefix: {
    type: String,
    default: 'Change to'
  },
  suffix: {
    type: String,
    default: ''
  },
  minWidthClass: {
    type: String,
    default: 'min-w-[60px]'
  }
});

const emit = defineEmits(['update:modelValue']);

const isTooltipVisible = ref(false);
const tooltipMessage = ref('');
const previewLabel = ref(null);

// Helper to normalized option structure
const normalizedOptions = computed(() => {
  return props.options.map((opt, index) => {
    if (typeof opt === 'object' && opt !== null && 'value' in opt) {
      return opt;
    }
    const label = props.displayLabels[index] || `${opt}${props.suffix}`;
    return { value: opt, label, tooltip: '' };
  });
});

const currentOptionIndex = computed(() => {
  const idx = normalizedOptions.value.findIndex(opt => opt.value === props.modelValue);
  return idx === -1 ? 0 : idx;
});

const buttonText = computed(() => {
  if (previewLabel.value) return previewLabel.value;
  return normalizedOptions.value[currentOptionIndex.value]?.label || '';
});

const cycleValue = () => {
  const nextIndex = (currentOptionIndex.value + 1) % normalizedOptions.value.length;
  const nextOption = normalizedOptions.value[nextIndex];
  emit('update:modelValue', nextOption.value);
  
  // Update preview immediately for the next one after this new value
  // Actually, usually when we click, we want to see what will happen NEXT time
  // But if we are hovering, the logic in handleMouseEnter handles "next of current"
  // Let's reset preview to avoid confusion or re-trigger mouseenter logic
  // The original component implementation updated the button text to the *next* value on click too?
  // Original: cycleFontSize -> emits new size -> button text follows props.fontSize.
  // BUT local 'fontSizeButtonText' was used.
  
  // If we are hovering, we should show the *next* of the *new* value.
  if (isTooltipVisible.value) {
    const nextNextIndex = (nextIndex + 1) % normalizedOptions.value.length;
    const nextNextOption = normalizedOptions.value[nextNextIndex];
    previewLabel.value = nextNextOption.label;
    
    // Update tooltip
    if (nextNextOption.tooltip) {
      tooltipMessage.value = nextNextOption.tooltip;
    } else {
      tooltipMessage.value = `${props.tooltipPrefix} ${nextNextOption.label}`;
    }
  } else {
    previewLabel.value = null;
  }
};

const handleMouseEnter = () => {
  const nextIndex = (currentOptionIndex.value + 1) % normalizedOptions.value.length;
  const nextOption = normalizedOptions.value[nextIndex];
  
  previewLabel.value = nextOption.label;
  
  if (nextOption.tooltip) {
    tooltipMessage.value = nextOption.tooltip;
  } else {
    tooltipMessage.value = `${props.tooltipPrefix} ${nextOption.label}`;
  }
  
  isTooltipVisible.value = true;
};

const handleMouseLeave = () => {
  isTooltipVisible.value = false;
  previewLabel.value = null;
};

// Reset preview if modelValue changes externally
watch(() => props.modelValue, () => {
  if (!isTooltipVisible.value) {
    previewLabel.value = null;
  }
});
</script>
