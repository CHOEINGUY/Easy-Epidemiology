<template>
  <div v-if="isProcessing" class="validation-progress">
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: progress + '%' }"></div>
    </div>
    <span class="progress-text">검증 중... {{ progress }}%</span>
  </div>
</template>

<script>
export default {
  name: 'ValidationProgress',
  props: {
    isProcessing: {
      type: Boolean,
      default: false
    },
    progress: {
      type: Number,
      default: 0
    }
  }
};
</script>

<style scoped>
.validation-progress {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 1000;
  min-width: 200px;
}

.progress-bar {
  width: 200px;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 5px;
}

.progress-fill {
  height: 100%;
  background: #4CAF50;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #666;
  display: block;
  text-align: center;
}
</style> 