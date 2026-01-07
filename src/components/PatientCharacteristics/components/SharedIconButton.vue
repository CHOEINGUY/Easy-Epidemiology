<template>
  <div class="icon-button-wrapper">
    <button @click="$emit('click')" :class="buttonClass">
      <span class="button-icon">
        <!-- Copy Icon -->
        <svg v-if="icon === 'copy'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <!-- Download Icon -->
        <svg v-else-if="icon === 'download'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      </span>
      <span class="button-text">{{ label }}</span>
    </button>
    <div v-if="showSuccess" class="copy-tooltip check-tooltip">
      <svg width="32" height="32" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="12" fill="#1a73e8"/>
        <polyline points="7,13 11,17 17,9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon: {
    type: String,
    required: true,
    validator: (value) => ['copy', 'download'].includes(value)
  },
  label: {
    type: String,
    required: true
  },
  showSuccess: {
    type: Boolean,
    default: false
  }
});

defineEmits(['click']);

const buttonClass = 'shared-icon-button';
</script>

<style scoped>
.icon-button-wrapper {
  position: relative;
  display: inline-block;
}

.shared-icon-button {
  padding: 8px 12px;
  border: none;
  background-color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #1a73e8;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.shared-icon-button:hover {
  background-color: rgba(26, 115, 232, 0.1);
}

.shared-icon-button:active {
  background-color: rgba(26, 115, 232, 0.2);
}

.button-icon {
  display: flex;
  align-items: center;
}

.button-text {
  font-family: "Noto Sans KR", sans-serif;
  font-weight: 400;
}

.copy-tooltip {
  position: absolute;
  left: 50%;
  top: 110%;
  transform: translateX(-50%);
  z-index: 10;
  pointer-events: none;
  animation: fadeInOut 1.5s;
}

.copy-tooltip.check-tooltip {
  width: 32px;
  height: 32px;
  padding: 0;
  background: none;
  box-shadow: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-tooltip.check-tooltip svg {
  display: block;
}

@keyframes fadeInOut {
  0% { opacity: 0; }
  10% { opacity: 0.95; }
  90% { opacity: 0.95; }
  100% { opacity: 0; }
}
</style>
