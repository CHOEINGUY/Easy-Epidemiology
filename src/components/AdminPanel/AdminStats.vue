<template>
  <div class="stats-dashboard">
    <div class="stats-bar">
      <!-- Total Users -->
      <div class="stat-item">
        <div class="stat-icon-box total">
          <span class="material-icons">group</span>
        </div>
        <div class="stat-content">
          <span class="stat-label">전체 사용자</span>
          <span class="stat-value">{{ stats.total }}</span>
        </div>
      </div>

      <div class="stat-separator"></div>

      <!-- Pending Users -->
      <div class="stat-item">
        <div class="stat-icon-box pending">
          <span class="material-icons">hourglass_empty</span>
        </div>
        <div class="stat-content">
          <span class="stat-label">승인 대기</span>
          <span class="stat-value">{{ stats.pending }}</span>
        </div>
      </div>

      <div class="stat-separator"></div>

      <!-- Approved Users -->
      <div class="stat-item">
        <div class="stat-icon-box approved">
          <span class="material-icons">check_circle</span>
        </div>
        <div class="stat-content">
          <span class="stat-label">승인됨</span>
          <span class="stat-value">{{ stats.approved }}</span>
        </div>
      </div>

      <div class="stat-separator"></div>

      <!-- Admin Users -->
      <div class="stat-item">
        <div class="stat-icon-box admin">
          <span class="material-icons">admin_panel_settings</span>
        </div>
        <div class="stat-content">
          <span class="stat-label">관리자</span>
          <span class="stat-value">{{ stats.admin }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AdminStats',
  props: {
    stats: {
      type: Object,
      required: true,
      default: () => ({
        total: 0,
        pending: 0,
        approved: 0,
        admin: 0
      })
    }
  }
};
</script>

<style scoped>
.stats-dashboard {
  margin-bottom: 24px;
}

.stats-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  padding: 28px 40px;
  border-radius: 20px;
  box-shadow: 
    0 20px 40px -10px rgba(15, 23, 42, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  transition: transform 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-2px);
}

.stat-icon-box {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.stat-icon-box .material-icons {
  font-size: 24px;
}

/* Icon Box Colors */
.stat-icon-box.total {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.stat-icon-box.pending {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.stat-icon-box.approved {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.stat-icon-box.admin {
  background: rgba(139, 92, 246, 0.2);
  color: #a78bfa;
}

/* Hover Glow Effect */
.stat-item:hover .stat-icon-box.total {
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
}

.stat-item:hover .stat-icon-box.pending {
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.4);
}

.stat-item:hover .stat-icon-box.approved {
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
}

.stat-item:hover .stat-icon-box.admin {
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
}

.stat-content {
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
  font-size: 1.75rem;
  font-weight: 800;
  color: #f8fafc;
  letter-spacing: -0.02em;
}

.stat-separator {
  width: 1px;
  height: 50px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    #334155 50%,
    transparent 100%
  );
  margin: 0 16px;
  flex-shrink: 0;
}

/* Responsive */
@media (max-width: 900px) {
  .stats-bar {
    flex-wrap: wrap;
    gap: 24px;
    padding: 24px;
  }

  .stat-separator {
    display: none;
  }

  .stat-item {
    flex: 0 0 calc(50% - 12px);
    padding: 16px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
}

@media (max-width: 480px) {
  .stat-item {
    flex: 0 0 100%;
  }
}
</style>
