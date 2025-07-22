<template>
  <div class="data-guide-container">
    <div class="guide-content">
      <div class="guide-title">{{ title }}</div>
      <div class="guide-description">{{ description }}</div>
      <div class="guide-steps">
        <div 
          v-for="(step, index) in steps" 
          :key="index" 
          class="step-item"
        >
          <span class="step-number">{{ step.number }}</span>
          <span class="step-text">{{ step.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon: {
    type: String,
    default: 'info'
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  steps: {
    type: Array,
    default: () => []
  }
});
</script>

<style scoped>
.data-guide-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(135deg, #f8f9ff 0%, #e8f4fd 100%);
  border: 2px solid #e3f2fd;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(26, 115, 232, 0.1);
  margin: 20px 0;
  width: 100%;
  box-sizing: border-box;
}

.guide-content {
  max-width: 600px;
  text-align: center;
}

.guide-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: #1a73e8;
}

.guide-description {
  font-size: 1rem;
  color: #5f6368;
  margin-bottom: 20px;
  line-height: 1.5;
}

.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  max-width: 500px;
}

.step-number {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1a73e8;
  background: #e8f4fd;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-text {
  font-size: 1rem;
  color: #3c4043;
  line-height: 1.4;
  text-align: left;
}
</style> 