<template>
  <section class="hero-section">
    <!-- Animated Background -->
    <div class="hero-bg">
      <div class="bg-grid"></div>
      <div class="bg-gradient"></div>
    </div>

    <div class="container">
      <div class="hero-content">
        <!-- Floating Badge -->
        <div class="hero-badge-wrapper">
          <span class="hero-badge">
            <span class="badge-dot"></span>
            {{ subtitle }}
          </span>
        </div>
        
        <!-- Main Title -->
        <h1 class="hero-title">
          <span class="title-block">{{ title.split(' ')[0] }}</span>
          <span class="title-highlight">{{ title.split(' ').slice(1).join(' ') }}</span>
        </h1>
        
        <!-- Description -->
        <p class="hero-description">{{ description }}</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { defineProps } from 'vue';

defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  description: { type: String, default: '' }
});
</script>

<style scoped>
.hero-section {
  position: relative;
  min-height: 85vh; /* Taller hero */
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  overflow: hidden;
  padding: 80px 0;
}

/* Background Effects */
.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.bg-grid {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(15, 23, 42, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15, 23, 42, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  mask-image: radial-gradient(circle at center, black, transparent 80%);
}

.bg-gradient {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.03), transparent 60%);
  animation: pulse 10s ease-in-out infinite alternate;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.1); opacity: 0.8; }
}

.container {
  position: relative;
  z-index: 10;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.hero-content {
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
}

/* Badge */
.hero-badge-wrapper {
  margin-bottom: 32px;
  animation: fadeUp 0.8s ease-out;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #e2e8f0;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  backdrop-filter: blur(4px);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.hero-badge:hover {
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.badge-dot {
  width: 6px;
  height: 6px;
  background-color: #3b82f6;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

/* Title */
.hero-title {
  font-size: 5rem; /* Massive size */
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
  letter-spacing: -0.04em;
  margin-bottom: 32px;
  animation: fadeUp 0.8s ease-out 0.1s backwards;
}

.title-block {
  display: block;
}

.title-highlight {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: block;
}

/* Description */
.hero-description {
  font-size: 1.35rem;
  color: #64748b;
  line-height: 1.6;
  max-width: 640px;
  margin: 0 auto 48px;
  font-weight: 400;
  animation: fadeUp 0.8s ease-out 0.2s backwards;
}

/* Actions */
.hero-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  animation: fadeUp 0.8s ease-out 0.3s backwards;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 32px;
  background: #0f172a;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: #1e293b;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px -5px rgba(15, 23, 42, 0.3);
}

.btn-secondary {
  padding: 16px 32px;
  background: white;
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 3rem;
  }
}
</style>
