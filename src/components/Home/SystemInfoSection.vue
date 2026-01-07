<template>
  <section class="system-section">
    <div class="container">
      
      <!-- Dashboard Stats Bar -->
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-label">System Status</span>
          <div class="stat-value-row">
            <span class="status-indicator online"></span>
            <span class="stat-value">Operational</span>
          </div>
        </div>
        <div class="stat-separator"></div>
        <div class="stat-item">
          <span class="stat-label">Version</span>
          <span class="stat-value">{{ basicConfig.version }}</span>
        </div>
        <div class="stat-separator"></div>
        <div class="stat-item">
          <span class="stat-label">Last Update</span>
          <span class="stat-value">{{ basicConfig.lastUpdate }}</span>
        </div>
        <div class="stat-separator"></div>
        <div class="stat-item">
          <span class="stat-label">Platform</span>
          <span class="stat-value">{{ basicConfig.platform }}</span>
        </div>
      </div>

      <div class="info-layout">
        <!-- Left: Organization & Contact -->
        <div class="info-col left-col">
          <div class="glass-card org-card">
            <div class="card-header">
              <h3 class="card-title">운영 기관</h3>
              <div class="org-badge">{{ organization.name }}</div>
            </div>
            <div class="card-body">
              <div class="org-details">
                <p class="org-dept">{{ organization.department }}</p>
                <p class="org-center">{{ organization.center }}</p>
              </div>
              
              <div class="team-list">
                <div 
                  v-for="member in organization.team" 
                  :key="member.role"
                  class="team-row"
                >
                  <span class="member-role">{{ member.role }}</span>
                  <span class="member-name">{{ member.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Education & Features -->
        <div class="info-col right-col">
          <div class="glass-card education-card">
            <div class="card-header">
              <h3 class="card-title">교육과정 연계</h3>
            </div>
            <div class="card-body">
              <ul class="edu-list">
                <li v-for="item in education.timeline" :key="item.title" class="edu-item">
                  <div class="edu-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
                  </div>
                  <div class="edu-content">
                    <span class="edu-title">{{ item.title }}</span>
                    <span class="edu-sub">{{ item.subtitle }}</span>
                  </div>
                </li>
              </ul>
              
              <div class="feature-tags">
                <span v-for="feature in systemFeatures" :key="feature" class="feature-pill">
                  {{ feature }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<script setup>
import { defineProps } from 'vue';

defineProps({
  basicConfig: { type: Object, required: true },
  currentDate: { type: String, required: true },
  systemFeatures: { type: Array, default: () => [] },
  targetUsers: { type: Array, default: () => [] },
  education: { type: Object, default: () => ({}) },
  organization: { type: Object, default: () => ({}) }
});
</script>

<style scoped>
.system-section {
  padding: 80px 0;
  background-color: #ffffff;
  border-top: 1px solid #f1f5f9;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Stats Bar */
.stats-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #0f172a;
  color: white;
  padding: 24px 40px;
  border-radius: 16px;
  box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.3);
  margin-bottom: 60px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  font-weight: 600;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: #f8fafc;
}

.stat-value-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #10b981;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
}

.stat-separator {
  width: 1px;
  height: 40px;
  background-color: #334155;
}

/* Info Layout */
.info-layout {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 32px;
}

/* Glass Cards */
.glass-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  overflow: hidden;
  height: 100%;
}

.card-header {
  padding: 24px 32px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.card-body {
  padding: 32px;
}

/* Organization */
.org-details {
  margin-bottom: 32px;
}

.org-badge {
  background: #eff6ff;
  color: #3b82f6;
  padding: 4px 12px;
  border-radius: 99px;
  font-size: 0.85rem;
  font-weight: 600;
}

.org-dept {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.org-center {
  color: #64748b;
}

.team-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.team-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #f1f5f9;
}

.member-role {
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 500;
}

.member-name {
  color: #0f172a;
  font-weight: 700;
}

/* Education */
.edu-list {
  list-style: none;
  padding: 0;
  margin: 0 0 32px 0;
}

.edu-item {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.edu-icon {
  width: 40px;
  height: 40px;
  background: #f0f9ff;
  color: #0ea5e9;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.edu-content {
  display: flex;
  flex-direction: column;
}

.edu-title {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
}

.edu-sub {
  font-size: 0.9rem;
  color: #64748b;
}

.feature-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.feature-pill {
  padding: 6px 14px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #475569;
}

@media (max-width: 900px) {
  .info-layout {
    grid-template-columns: 1fr;
  }
  .stats-bar {
    flex-wrap: wrap;
    gap: 24px;
  }
  .stat-separator {
    display: none;
  }
  .stat-item {
    width: 45%;
  }
}
</style>
