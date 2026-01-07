<template>
  <div class="step-indicator">
    <span 
      v-for="step in totalSteps" 
      :key="step"
      class="step-item"
    >
      <span class="step-number" :class="{ active: currentStep >= step }">
        {{ step }}
      </span>
      <span v-if="step < totalSteps" class="step-line" :class="{ active: currentStep > step }"></span>
    </span>
  </div>
</template>

<script>
export default {
  name: 'StepIndicator',
  props: {
    currentStep: {
      type: Number,
      required: true
    },
    totalSteps: {
      type: Number,
      default: 3
    }
  }
};
</script>

<style scoped>
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28px;
}

.step-item {
  display: flex;
  align-items: center;
}

.step-number {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  background: #f1f5f9;
  color: #94a3b8;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  border: 2px solid transparent;
}

.step-number.active {
  background: #0f172a;
  color: white;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
}

.step-line {
  width: 48px;
  height: 2px;
  background: #e2e8f0;
  margin: 0 12px;
  border-radius: 1px;
  transition: background 0.3s ease;
}

.step-line.active {
  background: #0f172a;
}

@media (max-width: 480px) {
  .step-line {
    width: 32px;
  }
}
</style>
