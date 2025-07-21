<template>
  <div class="app">
    <!-- Hero Section -->
    <div class="hero-section">
      <div class="hero-content">
        <div class="hero-badge">{{ config.basic.subtitle }}</div>
        <h1 class="hero-title">{{ config.basic.title }}</h1>
        <p class="hero-description">
          {{ config.basic.description }}
        </p>
      </div>
    </div>

    <!-- Features Grid -->
    <div class="features-section">
      <div class="container">
        <h2 class="section-title">핵심 분석 기능</h2>
        <div class="features-grid">
          <div 
            v-for="feature in config.features" 
            :key="feature.title"
            class="feature-card"
          >
            <div class="feature-icon">{{ feature.icon }}</div>
            <h3 class="feature-title">{{ feature.title }}</h3>
            <p class="feature-description">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Info Section -->
    <div class="info-section">
      <div class="container">
        <h2 class="section-title">시스템 개요</h2>
        
        <!-- 메인 인포 패널 -->
        <div class="info-main-panel">
          <div class="info-left">
            <div class="info-highlight">
              <div class="highlight-item">
                <div class="highlight-icon">📅</div>
                <div class="highlight-content">
                  <div class="highlight-label">버전</div>
                  <div class="highlight-value">{{ config.basic.version }}</div>
                </div>
              </div>
              <div class="highlight-item">
                <div class="highlight-icon">🔄</div>
                <div class="highlight-content">
                  <div class="highlight-label">최종 업데이트</div>
                  <div class="highlight-value">{{ config.basic.lastUpdate }}</div>
                </div>
              </div>
              <div class="highlight-item">
                <div class="highlight-icon">🌐</div>
                <div class="highlight-content">
                  <div class="highlight-label">접속일시</div>
                  <div class="highlight-value">{{ currentDate }}</div>
                </div>
              </div>
              <div class="highlight-item">
                <div class="highlight-icon">💻</div>
                <div class="highlight-content">
                  <div class="highlight-label">플랫폼</div>
                  <div class="highlight-value">{{ config.basic.platform }}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="info-right">
            <div class="info-description">
              <h3 class="info-desc-title">시스템 특징</h3>
              <ul class="info-desc-list">
                <li v-for="feature in config.systemFeatures" :key="feature">{{ feature }}</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 세부 정보 섹션 -->
        <div class="info-details">
          <div class="detail-section">
            <div class="detail-header">
              <div class="detail-icon">👥</div>
              <h3 class="detail-title">대상 사용자</h3>
            </div>
            <div class="detail-content">
              <div class="user-tags">
                <div 
                  v-for="user in config.targetUsers" 
                  :key="user.name"
                  :class="['user-tag', user.type]"
                >
                  {{ user.name }}
                </div>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-header">
              <div class="detail-icon">🎓</div>
              <h3 class="detail-title">교육과정 연계</h3>
            </div>
            <div class="detail-content">
              <div class="education-timeline">
                <div 
                  v-for="item in config.education.timeline" 
                  :key="item.title"
                  class="timeline-item"
                >
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <div class="timeline-title">{{ item.title }}</div>
                    <div class="timeline-subtitle">{{ item.subtitle }}</div>
                  </div>
                </div>
              </div>
              <div class="education-highlight">
                {{ config.education.highlight }}
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-header">
              <div class="detail-icon">🏛️</div>
              <h3 class="detail-title">개발 · 운영기관</h3>
            </div>
            <div class="detail-content">
              <div class="org-info">
                <div class="org-main-info">
                  <div class="org-logo">🏥</div>
                  <div class="org-details">
                    <div class="org-name">{{ config.organization.name }}</div>
                    <div class="org-dept">{{ config.organization.department }}</div>
                    <div class="org-center">{{ config.organization.center }}</div>
                  </div>
                </div>
                <div class="team-cards">
                  <div 
                    v-for="member in config.organization.team" 
                    :key="member.role"
                    class="team-card"
                  >
                    <div class="team-role">{{ member.role }}</div>
                    <div class="team-name">{{ member.name }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Guide -->
    <div class="guide-section">
      <div class="container">
        <h2 class="section-title">빠른 시작 가이드</h2>
        <div class="guide-steps">
          <div 
            v-for="step in config.quickGuide" 
            :key="step.step"
            class="step-item"
          >
            <div class="step-number">{{ step.step }}</div>
            <div class="step-content">
              <h4 class="step-title">{{ step.title }}</h4>
              <p class="step-description">{{ step.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Contact Section -->
    <div class="contact-section-professional">
      <div class="container">
        <h2 class="section-title">Contact & Support</h2>
        <div class="contact-grid">
          <div class="contact-item-prof">
            <div class="contact-icon-prof-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            </div>
            <h4 class="contact-item-title-prof">유선 문의</h4>
            <p class="contact-item-text-prof">양정호: 061-379-2630</p>
            <p class="contact-item-text-prof">최인규: 061-372-4175</p>
          </div>
          <div class="contact-item-prof">
            <div class="contact-icon-prof-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </div>
            <h4 class="contact-item-title-prof">이메일 문의</h4>
            <p class="contact-item-text-prof">양정호: st15231@naver.com</p>
            <p class="contact-item-text-prof">최인규: chldlsrb07@gmail.com</p>
          </div>
          <div class="contact-item-prof">
            <div class="contact-icon-prof-wrapper">
               <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
            </div>
            <h4 class="contact-item-title-prof">{{ config.contact.title }}</h4>
            <p class="contact-item-text-prof">{{ config.contact.organization }}</p>
            <p class="contact-item-text-prof sub">{{ config.contact.department }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { loadSiteConfig } from '@/config/siteConfig';

const currentDate = ref('');
const config = ref(loadSiteConfig());

onMounted(() => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  // 현재 시간을 KST 기준으로 포맷 (선택 사항)
  // const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Seoul' };
  // currentDate.value = new Intl.DateTimeFormat('ko-KR', options).format(today);
  currentDate.value = `${year}/${month}/${day}`; // YYYY/MM/DD 형식 유지
});
</script>

<style scoped>
/* === 기본 앱 스타일 === */
.app {
  background: #f8fafc;
  min-height: 100vh;
  font-family: "Noto Sans KR", sans-serif;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* === Hero Section === */
.hero-section {
  background: linear-gradient(135deg, #4285f4 0%, #1976d2 100%);
  color: white;
  padding: 80px 0;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><circle cx="200" cy="200" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="800" cy="300" r="1.5" fill="rgba(255,255,255,0.1)"/><circle cx="400" cy="600" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="900" cy="700" r="2" fill="rgba(255,255,255,0.1)"/></svg>');
  opacity: 0.3;
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 20px;
}

.hero-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  padding: 8px 20px;
  border-radius: 25px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 20px;
  line-height: 1.2;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.hero-description {
  font-size: 1.3rem;
  margin-bottom: 40px;
  opacity: 0.9;
  line-height: 1.6;
  font-weight: 300;
}

/* === Features Section === */
.features-section {
  padding: 80px 0;
  background: #f8fafc;
}

.section-title {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 60px;
  color: #2d3748;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
}

.feature-card {
  background: white;
  padding: 40px 30px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 1px solid #e2e8f0;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 20px;
  display: block;
}

.feature-title {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 15px;
  color: #2d3748;
}

.feature-description {
  color: #64748b;
  line-height: 1.6;
  font-size: 1rem;
}

/* === Info Section === */
.info-section {
  padding: 80px 0;
  background: white;
}

/* 메인 인포 패널 */
.info-main-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  margin-bottom: 60px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}

.info-left {
  display: flex;
  flex-direction: column;
}

.info-highlight {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.highlight-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.highlight-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.highlight-icon {
  font-size: 1.8rem;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4285f4 0%, #1976d2 100%);
  border-radius: 12px;
  color: white;
  box-shadow: 0 4px 15px rgba(66, 133, 244, 0.3);
}

.highlight-content {
  flex: 1;
}

.highlight-label {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 4px;
}

.highlight-value {
  font-size: 1rem;
  color: #2d3748;
  font-weight: 700;
}

.info-right {
  display: flex;
  align-items: center;
}

.info-description {
  width: 100%;
}

.info-desc-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 25px;
  position: relative;
}

.info-desc-title::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 50px;
  height: 3px;
  background: linear-gradient(135deg, #4285f4 0%, #1976d2 100%);
  border-radius: 2px;
}

.info-desc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.info-desc-list li {
  padding: 12px 0;
  color: #4a5568;
  font-size: 1.05rem;
  line-height: 1.6;
  position: relative;
  padding-left: 30px;
}

.info-desc-list li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #4285f4;
  font-weight: bold;
  font-size: 1.1rem;
}

/* 세부 정보 섹션 */
.info-details {
  display: flex;
  flex-direction: column;
  gap: 50px;
}

.detail-section {
  background: #f8fafc;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.detail-header {
  background: linear-gradient(135deg, #4285f4 0%, #1976d2 100%);
  color: white;
  padding: 25px 30px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.detail-icon {
  font-size: 1.8rem;
}

.detail-title {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0;
}

.detail-content {
  padding: 30px;
}

/* 사용자 태그 */
.user-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.user-tag {
  padding: 10px 18px;
  border-radius: 25px;
  font-size: 0.9rem;
  font-weight: 500;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: default;
}

.user-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.user-tag.gov {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: white;
}

.user-tag.local {
  background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
  color: white;
}

.user-tag.expert {
  background: linear-gradient(135deg, #45b7d1 0%, #3742fa 100%);
  color: white;
}

.user-tag.research {
  background: linear-gradient(135deg, #96ceb4 0%, #ffeaa7 100%);
  color: #2d3436;
}

/* 교육과정 타임라인 */
.education-timeline {
  margin-bottom: 25px;
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 25px;
  position: relative;
}

.timeline-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 12px;
  top: 30px;
  width: 2px;
  height: 40px;
  background: #e2e8f0;
}

.timeline-dot {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #4285f4 0%, #1976d2 100%);
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 4px 15px rgba(66, 133, 244, 0.3);
}

.timeline-content {
  flex: 1;
}

.timeline-title {
  font-weight: 600;
  color: #2d3748;
  font-size: 1.05rem;
  margin-bottom: 5px;
}

.timeline-subtitle {
  color: #4285f4;
  font-size: 0.9rem;
  font-weight: 500;
}

.education-highlight {
  background: linear-gradient(135deg, #e6fffa 0%, #b2f5ea 100%);
  padding: 20px;
  border-radius: 12px;
  color: #234e52;
  font-size: 1rem;
  font-weight: 500;
  border-left: 4px solid #38b2ac;
}

/* 조직 정보 */
.org-info {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.org-main-info {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 25px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.org-logo {
  font-size: 3rem;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4285f4 0%, #1976d2 100%);
  border-radius: 16px;
  color: white;
  box-shadow: 0 4px 15px rgba(66, 133, 244, 0.3);
}

.org-details {
  flex: 1;
}

.org-name {
  font-weight: 700;
  color: #2d3748;
  font-size: 1.3rem;
  margin-bottom: 5px;
}

.org-dept {
  font-weight: 600;
  color: #4285f4;
  font-size: 1.1rem;
  margin-bottom: 8px;
}

.org-center {
  color: #64748b;
  font-size: 1rem;
  line-height: 1.4;
}

.team-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.team-card {
  background: white;
  padding: 25px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.team-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.team-role {
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 8px;
}

.team-name {
  font-size: 1.1rem;
  color: #2d3748;
  font-weight: 700;
}

/* === Guide Section === */
.guide-section {
  padding: 80px 0;
  background: #f8fafc;
}

.guide-steps {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-top: 40px;
}

.step-item {
  flex: 1;
  text-align: center;
  position: relative;
}

.step-item:not(:last-child)::after {
  content: '→';
  position: absolute;
  top: 25px;
  right: -15px;
  color: #cbd5e0;
  font-size: 1.5rem;
  font-weight: bold;
}

.step-number {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #4285f4 0%, #1976d2 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.2rem;
  margin: 0 auto 20px;
  box-shadow: 0 4px 15px rgba(66, 133, 244, 0.3);
}

.step-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 10px;
  color: #2d3748;
}

.step-description {
  color: #64748b;
  font-size: 0.9rem;
  line-height: 1.5;
}

/* === Contact Section === */
.contact-section-professional {
  padding: 80px 0;
  background: linear-gradient(135deg, #4285f4 0%, #1976d2 100%);
}

.contact-section-professional .section-title {
  color: white;
  margin-bottom: 60px;
}

.contact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  text-align: center;
}

.contact-item-prof {
  background: rgba(255, 255, 255, 0.9); /* Slightly transparent white */
  backdrop-filter: blur(5px);
  padding: 40px 30px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.contact-item-prof:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
}

.contact-icon-prof-wrapper {
  width: 60px;
  height: 60px;
  margin: 0 auto 25px auto;
  background: linear-gradient(135deg, #4285f4 0%, #1976d2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 15px rgba(66, 133, 244, 0.2);
}

.contact-item-title-prof {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 20px;
  color: #2d3748;
}

.contact-item-text-prof {
  font-size: 1rem;
  color: #4a5568;
  line-height: 1.6;
  margin: 5px 0;
}

.contact-item-text-prof.sub {
  color: #4a5568;
  font-size: 0.95rem;
}

/* === 반응형 디자인 === */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-description {
    font-size: 1.1rem;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .info-main-panel {
    grid-template-columns: 1fr;
    gap: 40px;
    padding: 30px;
  }
  
  .info-highlight {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .user-tags {
    justify-content: center;
  }
  
  .team-cards {
    grid-template-columns: 1fr;
  }
  
  .org-main-info {
    flex-direction: column;
    text-align: center;
  }
  
  .guide-steps {
    flex-direction: column;
    gap: 30px;
  }

  .step-item:not(:last-child)::after {
    content: '↓';
    top: auto;
    bottom: -20px;
    right: 50%;
    transform: translateX(50%);
  }

  .contact-info {
    gap: 15px;
  }

  .contact-item {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .hero-content {
    padding: 0 15px;
  }
  
  .hero-title {
    font-size: 2rem;
  }

  .section-title {
    font-size: 2rem;
  }
  
  .feature-card {
    padding: 30px 20px;
  }
  
  .contact-card {
    padding: 30px 20px;
  }
}
</style>
