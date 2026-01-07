<template>
  <section class="features-section">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">강력한 분석 도구</h2>
        <p class="section-subtitle">역학조사의 모든 단계를 위한 전문적인 솔루션</p>
      </div>

      <div class="bento-grid">
        <!-- #0: Data Input (Large Card) -->
        <div class="bento-card large-card card-0">
          <div class="card-content">
            <div class="icon-box">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </div>
            <h3 class="card-title">{{ features[0].title }}</h3>
            <p class="card-desc">{{ features[0].description }}</p>
          </div>
          <div class="card-visual visual-input">
            <!-- Abstract UI representation -->
            <div class="ui-mockup">
              <div class="ui-row"></div>
              <div class="ui-row"></div>
              <div class="ui-row short"></div>
            </div>
          </div>
        </div>

        <!-- #1: Characteristics (Small Card) -->
        <div class="bento-card small-card card-1">
          <div class="icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <h3 class="card-title">{{ features[1].title }}</h3>
          <p class="card-desc">{{ features[1].description }}</p>
        </div>

        <!-- #2: Symptoms (Small Card) -->
        <div class="bento-card small-card card-2">
          <div class="icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
          </div>
          <h3 class="card-title">{{ features[2].title }}</h3>
          <p class="card-desc">{{ features[2].description }}</p>
        </div>

        <!-- #3: Epidemic Curve (Wide Card) -->
        <div class="bento-card wide-card card-3">
          <div class="card-content-side">
            <div class="icon-box">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>
            </div>
            <div>
              <h3 class="card-title">{{ features[3].title }}</h3>
              <p class="card-desc">{{ features[3].description }}</p>
            </div>
          </div>
          <div class="card-visual visual-chart">
            <div class="chart-bars">
              <div class="bar" style="height: 40%"></div>
              <div class="bar" style="height: 70%"></div>
              <div class="bar" style="height: 50%"></div>
              <div class="bar" style="height: 100%"></div>
              <div class="bar" style="height: 60%"></div>
            </div>
          </div>
        </div>

        <!-- #4: Case Control (Medium Card) -->
        <div class="bento-card medium-card card-4">
          <div class="icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <h3 class="card-title">{{ features[4].title }}</h3>
          <p class="card-desc">{{ features[4].description }}</p>
        </div>

        <!-- #5: Cohort (Medium Card) -->
        <div class="bento-card medium-card card-5">
          <div class="icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
          </div>
          <h3 class="card-title">{{ features[5].title }}</h3>
          <p class="card-desc">{{ features[5].description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { defineProps } from 'vue';

defineProps({
  features: { type: Array, default: () => [] }
});
</script>

<style scoped>
.features-section {
  padding: 120px 0;
  background-color: #f8fafc;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.section-header {
  text-align: center;
  max-width: 600px;
  margin: 0 auto 80px;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 16px;
  letter-spacing: -0.03em;
}

.section-subtitle {
  font-size: 1.1rem;
  color: #64748b;
  line-height: 1.6;
}

/* Bento Grid System */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 3 Column Grid */
  grid-auto-rows: minmax(280px, auto);
  gap: 24px;
}

/* Card Base */
.bento-card {
  background: white;
  border-radius: 24px;
  padding: 32px;
  border: 1px solid #e2e8f0;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
}

.bento-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.05);
  border-color: #cbd5e1;
}

/* Grid Layout Assigment */
.card-0 { /* Data Input */
  grid-column: span 1;
  grid-row: span 2;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
}

.card-1 { /* Characteristics */
  grid-column: span 1;
}

.card-2 { /* Symptoms */
  grid-column: span 1;
}

.card-3 { /* Epi Curve - Wide */
  grid-column: span 2;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.card-4 { /* Case Control */
  grid-column: span 1;
}

.card-5 { /* Cohort */
  grid-column: span 2; /* Stretch to fill if needed, or modify grid */
  /* Let's actually make row 3 fit nicely. We have 3 cols.
     Row 1: [0(1x2)] [1] [2]
     Row 2: [0(cont)] [3(2x1)]
     Row 3: [4] [5(2x1)] 
  */
}

/* Re-adjusting for 3-col layout explicitly */
.card-0 { grid-column: 1 / 2; grid-row: 1 / 3; }
.card-1 { grid-column: 2 / 3; grid-row: 1 / 2; }
.card-2 { grid-column: 3 / 4; grid-row: 1 / 2; }
.card-3 { grid-column: 2 / 4; grid-row: 2 / 3; } /* Wide across 2 cols */
.card-4 { grid-column: 1 / 2; grid-row: 3 / 4; }
.card-5 { grid-column: 2 / 4; grid-row: 3 / 4; }

/* Content Styling */
.icon-box {
  width: 48px;
  height: 48px;
  background-color: #f1f5f9;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0f172a;
  margin-bottom: 24px;
}

.bento-card:hover .icon-box {
  background-color: #0f172a;
  color: white;
  transition: all 0.3s ease;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12px;
  letter-spacing: -0.01em;
}

.card-desc {
  font-size: 0.95rem;
  color: #64748b;
  line-height: 1.6;
}

/* Visuals included in cards */
.card-visual {
  margin-top: auto;
  padding-top: 32px;
  display: flex;
  justify-content: center;
  opacity: 0.8;
}

.ui-mockup {
  width: 100%;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.ui-row {
  height: 8px;
  background: #f1f5f9;
  border-radius: 4px;
  margin-bottom: 8px;
  width: 100%;
}
.ui-row.short { width: 60%; }

.chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 100px;
}

.bar {
  width: 20px;
  background: #cbd5e1;
  border-radius: 4px 4px 0 0;
  transition: height 0.3s ease, background 0.3s ease;
}

.bento-card:hover .bar {
  background: #3b82f6;
}

@media (max-width: 1024px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .card-0 { grid-column: span 2; grid-row: span 1; }
  .card-1 { grid-column: span 1; }
  .card-2 { grid-column: span 1; }
  .card-3 { grid-column: span 2; }
  .card-4 { grid-column: span 1; }
  .card-5 { grid-column: span 1; }
}

@media (max-width: 600px) {
  .bento-grid {
    grid-template-columns: 1fr;
  }
  .card-0, .card-1, .card-2, .card-3, .card-4, .card-5 {
    grid-column: span 1;
    grid-row: span 1;
  }
}
</style>
