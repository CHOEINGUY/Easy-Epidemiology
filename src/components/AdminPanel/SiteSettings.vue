<template>
  <div class="settings-wrapper">
    <!-- Header Section -->
    <div class="settings-header">
      <div class="header-icon">
        <span class="material-icons">tune</span>
      </div>
      <div class="header-text">
        <h2>사이트 설정 관리</h2>
        <p>홈페이지의 정보를 동적으로 관리할 수 있습니다.</p>
      </div>
    </div>
    
    <div class="settings-content">
      <!-- 기본 정보 설정 -->
      <div class="settings-section">
        <div class="section-header">
          <div class="section-icon">
            <span class="material-icons">info</span>
          </div>
          <h3>기본 정보</h3>
        </div>
        <div class="settings-grid">
          <div class="setting-item">
            <label>제목</label>
            <input v-model="localConfig.basic.title" type="text" class="setting-input">
          </div>
          <div class="setting-item">
            <label>부제목</label>
            <input v-model="localConfig.basic.subtitle" type="text" class="setting-input">
          </div>
          <div class="setting-item full-width">
            <label>설명</label>
            <textarea v-model="localConfig.basic.description" class="setting-textarea"></textarea>
          </div>
          <div class="setting-item">
            <label>버전</label>
            <input v-model="localConfig.basic.version" type="text" class="setting-input">
          </div>
          <div class="setting-item">
            <label>최종 업데이트</label>
            <input v-model="localConfig.basic.lastUpdate" type="text" class="setting-input">
          </div>
          <div class="setting-item">
            <label>플랫폼</label>
            <input v-model="localConfig.basic.platform" type="text" class="setting-input">
          </div>
        </div>
      </div>

      <!-- 조직 정보 설정 -->
      <div class="settings-section">
        <div class="section-header">
          <div class="section-icon">
            <span class="material-icons">business</span>
          </div>
          <h3>조직 정보</h3>
        </div>
        <div class="settings-grid">
          <div class="setting-item">
            <label>기관명</label>
            <input v-model="localConfig.organization.name" type="text" class="setting-input">
          </div>
          <div class="setting-item">
            <label>부서</label>
            <input v-model="localConfig.organization.department" type="text" class="setting-input">
          </div>
          <div class="setting-item">
            <label>센터명</label>
            <input v-model="localConfig.organization.center" type="text" class="setting-input">
          </div>
        </div>
        
        <div class="subsection">
          <div class="subsection-header">
            <span class="material-icons">groups</span>
            <h4>팀원 정보</h4>
          </div>
          <div class="list-items">
            <div 
              v-for="(member, index) in localConfig.organization.team" 
              :key="index"
              class="list-item"
            >
              <div class="item-inputs">
                <input v-model="member.role" type="text" placeholder="역할" class="setting-input">
                <input v-model="member.name" type="text" placeholder="이름" class="setting-input">
              </div>
              <button @click="removeTeamMember(index)" class="remove-btn" title="삭제">
                <span class="material-icons">close</span>
              </button>
            </div>
          </div>
          <button @click="addTeamMember" class="add-btn">
            <span class="material-icons">add</span>
            팀원 추가
          </button>
        </div>
      </div>

      <!-- 기능 카드 설정 -->
      <div class="settings-section">
        <div class="section-header">
          <div class="section-icon">
            <span class="material-icons">widgets</span>
          </div>
          <h3>기능 카드</h3>
        </div>
        <div class="list-items features-list">
          <div 
            v-for="(feature, index) in localConfig.features" 
            :key="index"
            class="feature-card"
          >
            <div class="feature-header">
              <span class="feature-number">{{ index + 1 }}</span>
              <button @click="removeFeature(index)" class="remove-btn small" title="삭제">
                <span class="material-icons">close</span>
              </button>
            </div>
            <div class="feature-inputs">
              <div class="setting-item">
                <label>아이콘</label>
                <input v-model="feature.icon" type="text" placeholder="이모지" class="setting-input icon-input">
              </div>
              <div class="setting-item">
                <label>제목</label>
                <input v-model="feature.title" type="text" placeholder="기능 제목" class="setting-input">
              </div>
              <div class="setting-item full-width">
                <label>설명</label>
                <textarea v-model="feature.description" placeholder="기능 설명" class="setting-textarea"></textarea>
              </div>
            </div>
          </div>
        </div>
        <button @click="addFeature" class="add-btn">
          <span class="material-icons">add</span>
          기능 카드 추가
        </button>
      </div>

      <!-- 시스템 특징 설정 -->
      <div class="settings-section">
        <div class="section-header">
          <div class="section-icon">
            <span class="material-icons">star</span>
          </div>
          <h3>시스템 특징</h3>
        </div>
        <div class="tags-container">
          <div 
            v-for="(feature, index) in localConfig.systemFeatures" 
            :key="index"
            class="tag-item"
          >
            <input v-model="localConfig.systemFeatures[index]" type="text" class="tag-input">
            <button @click="removeSystemFeature(index)" class="remove-tag-btn" title="삭제">
              <span class="material-icons">close</span>
            </button>
          </div>
          <button @click="addSystemFeature" class="add-tag-btn">
            <span class="material-icons">add</span>
          </button>
        </div>
      </div>

      <!-- 저장 버튼 -->
      <div class="settings-actions">
        <button @click="$emit('reset')" class="reset-btn">
          <span class="material-icons">restore</span>
          기본값으로 복원
        </button>
        <button @click="$emit('save')" class="save-btn">
          <span class="material-icons">save</span>
          설정 저장
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SiteSettings',
  props: {
    config: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      localConfig: JSON.parse(JSON.stringify(this.config))
    };
  },
  watch: {
    config: {
      handler(newVal) {
        this.localConfig = JSON.parse(JSON.stringify(newVal));
      },
      deep: true
    },
    localConfig: {
      handler(newVal) {
        this.$emit('update:config', newVal);
      },
      deep: true
    }
  },
  methods: {
    addTeamMember() {
      this.localConfig.organization.team.push({
        role: '',
        name: ''
      });
    },

    removeTeamMember(index) {
      this.localConfig.organization.team.splice(index, 1);
    },

    addFeature() {
      this.localConfig.features.push({
        icon: '',
        title: '',
        description: ''
      });
    },

    removeFeature(index) {
      this.localConfig.features.splice(index, 1);
    },

    addSystemFeature() {
      this.localConfig.systemFeatures.push('');
    },

    removeSystemFeature(index) {
      this.localConfig.systemFeatures.splice(index, 1);
    }
  }
};
</script>

<style scoped>
.settings-wrapper {
  background: white;
  border-radius: 24px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

/* Header */
.settings-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 32px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border-bottom: 1px solid #334155;
}

.header-icon {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #60a5fa;
}

.header-icon .material-icons {
  font-size: 28px;
}

.header-text h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0 0 4px 0;
}

.header-text p {
  color: #94a3b8;
  margin: 0;
  font-size: 14px;
}

/* Content */
.settings-content {
  padding: 32px;
}

/* Sections */
.settings-section {
  margin-bottom: 32px;
  padding: 28px;
  background: #f8fafc;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}

.section-icon {
  width: 44px;
  height: 44px;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-icon .material-icons {
  font-size: 22px;
}

.section-header h3 {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

/* Settings Grid */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-item.full-width {
  grid-column: 1 / -1;
}

.setting-item label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.setting-input {
  padding: 14px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  background: white;
  color: #1e293b;
  transition: all 0.2s ease;
}

.setting-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
}

.setting-input::placeholder {
  color: #94a3b8;
}

.setting-textarea {
  padding: 14px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  min-height: 100px;
  resize: vertical;
  background: white;
  color: #1e293b;
  transition: all 0.2s ease;
  font-family: inherit;
}

.setting-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
}

/* Subsections */
.subsection {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.subsection-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  color: #64748b;
}

.subsection-header .material-icons {
  font-size: 20px;
}

.subsection-header h4 {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: #475569;
}

/* List Items */
.list-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.list-item:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.item-inputs {
  display: flex;
  gap: 12px;
  flex: 1;
}

.item-inputs .setting-input {
  flex: 1;
}

/* Feature Cards */
.features-list {
  gap: 16px;
}

.feature-card {
  padding: 20px;
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.feature-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.feature-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.feature-number {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
}

.feature-inputs {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 16px;
}

.feature-inputs .full-width {
  grid-column: 1 / -1;
}

.icon-input {
  text-align: center;
  font-size: 20px;
}

/* Tags Container */
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.tag-item {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.tag-item:hover {
  border-color: #cbd5e1;
}

.tag-input {
  padding: 10px 14px;
  border: none;
  font-size: 14px;
  background: transparent;
  min-width: 120px;
  color: #1e293b;
}

.tag-input:focus {
  outline: none;
}

.remove-tag-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 100%;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
}

.remove-tag-btn:hover {
  background: #fee2e2;
  color: #dc2626;
}

.remove-tag-btn .material-icons {
  font-size: 16px;
}

.add-tag-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 2px dashed #cbd5e1;
  background: transparent;
  border-radius: 10px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-tag-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #eff6ff;
}

/* Buttons */
.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: white;
  border: 2px dashed #cbd5e1;
  border-radius: 14px;
  color: #64748b;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #eff6ff;
}

.add-btn .material-icons {
  font-size: 20px;
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.remove-btn:hover {
  background: #dc2626;
  color: white;
  transform: scale(1.05);
}

.remove-btn.small {
  width: 28px;
  height: 28px;
}

.remove-btn .material-icons {
  font-size: 18px;
}

.remove-btn.small .material-icons {
  font-size: 16px;
}

/* Actions */
.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.save-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 14px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
}

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

.save-btn:active {
  transform: translateY(0);
}

.reset-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  background: white;
  border: 1px solid #e2e8f0;
  color: #64748b;
  border-radius: 14px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-btn:hover {
  border-color: #f87171;
  color: #dc2626;
  background: #fef2f2;
}

.save-btn .material-icons,
.reset-btn .material-icons {
  font-size: 20px;
}

/* Responsive */
@media (max-width: 768px) {
  .settings-header {
    padding: 24px;
  }

  .settings-content {
    padding: 20px;
  }

  .settings-section {
    padding: 20px;
  }

  .settings-grid {
    grid-template-columns: 1fr;
  }

  .item-inputs {
    flex-direction: column;
  }

  .feature-inputs {
    grid-template-columns: 1fr;
  }

  .settings-actions {
    flex-direction: column-reverse;
  }

  .save-btn,
  .reset-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
