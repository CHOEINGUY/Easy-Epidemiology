<template>
  <section class="guide-section">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">분석 프로세스</h2>
        <p class="section-subtitle">데이터 입력부터 보고서 작성까지, 원스톱 워크플로우</p>
      </div>
      
      <div class="process-flow">
        <div 
          v-for="(step, index) in steps" 
          :key="step.step"
          class="process-step"
        >
          <!-- Step Circle -->
          <div class="step-circle">
            <span class="step-num">{{ step.step }}</span>
          </div>

          <!-- Connector Arrow (Desktop) -->
          <div v-if="index < steps.length - 1" class="step-connector">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </div>

          <!-- Content -->
          <div class="step-content">
            <h4 class="step-title">{{ step.title }}</h4>
            <p class="step-desc">{{ step.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { defineProps } from 'vue';

defineProps({
  steps: { type: Array, default: () => [] }
});
</script>

<style scoped>
.guide-section {
  padding: 100px 0;
  background-color: #f8fafc;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;
}

.section-title {
  font-size: 2rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 8px;
}

.section-subtitle {
  color: #64748b;
  font-size: 1.1rem;
}

/* Process Flow */
.process-flow {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.process-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
}

.step-circle {
  width: 56px;
  height: 56px;
  background: white;
  border: 2px solid #0f172a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  z-index: 2;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.step-num {
  font-size: 1.25rem;
  font-weight: 800;
  color: #0f172a;
}

.step-connector {
  position: absolute;
  top: 28px;
  left: 50%;
  width: 100%;
  height: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e2e8f0;
  transform: translateY(-50%);
  z-index: 1;
}

.step-connector svg {
  margin-left: auto;
  margin-right: -12px; /* Pull arrow head closer to next circle */
  background: #f8fafc;
  padding: 0 4px;
}

.step-title {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}

.step-desc {
  font-size: 0.9rem;
  color: #64748b;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .process-flow {
    flex-direction: column;
    gap: 48px;
  }
  
  .step-connector {
    display: none;
  }
}
</style>
