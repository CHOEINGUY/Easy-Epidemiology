<template>
  <div class="tab-navigation">
    <div class="tab-container">
      <button 
        class="tab-btn" 
        :class="{ active: !showRegister }"
        @click="$emit('update:showRegister', false)"
      >
        <span class="tab-icon material-icons">login</span>
        로그인
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: showRegister }"
        @click="$emit('update:showRegister', true)"
      >
        <span class="tab-icon material-icons">person_add</span>
        회원가입
      </button>
      
      <!-- Active Indicator -->
      <div class="tab-indicator" :class="{ 'register-active': showRegister }"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AuthTabs',
  props: {
    showRegister: {
      type: Boolean,
      required: true
    }
  }
};
</script>

<style scoped>
.tab-navigation {
  margin-bottom: 32px;
  animation: fadeUp 0.8s ease-out 0.3s backwards;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}

.tab-container {
  display: flex;
  position: relative;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 4px;
}

.tab-btn {
  flex: 1;
  padding: 12px 16px;
  background: transparent;
  border: none;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 8px;
}

.tab-btn:hover:not(.active) {
  color: #475569;
}

.tab-btn.active {
  color: #0f172a;
}

.tab-icon {
  font-size: 18px;
}

/* Sliding Active Indicator */
.tab-indicator {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 1;
}

.tab-indicator.register-active {
  transform: translateX(100%);
}
</style>
