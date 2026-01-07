<template>
  <section class="footer-section">
    <div class="container">
      <div class="footer-grid">
        <!-- Brand / Contact -->
        <div class="footer-col brand-col">
          <h3 class="footer-brand">{{ contactInfo.title }}</h3>
          <p class="brand-desc">감염병 역학조사 및 현장 대응 연구센터</p>
          <div class="contact-details">
            <div class="contact-row">
              <span class="label">운영</span>
              <span class="value">{{ contactInfo.organization }}</span>
            </div>
            <div class="contact-row">
              <span class="label">부서</span>
              <span class="value">{{ contactInfo.department }}</span>
            </div>
          </div>
        </div>

        <!-- Direct Contact -->
        <div class="footer-col">
          <h4 class="col-title">기술 지원</h4>
          <ul class="footer-links">
            <li>
              <span class="link-label">양정호 책임</span>
              <span class="link-val">061-379-2630</span>
            </li>
            <li>
              <span class="link-label">최인규 연구원</span>
              <span class="link-val">061-372-4175</span>
            </li>
          </ul>
        </div>
        
        <div class="footer-col">
          <h4 class="col-title">이메일 문의</h4>
          <ul class="footer-links">
            <li>st15231@naver.com</li>
            <li>chldlsrb07@gmail.com</li>
          </ul>
        </div>
      </div>
      
      <div class="footer-bottom">
        <p>&copy; 2025 Easy-Epidemiology Web. All rights reserved.</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { defineProps } from 'vue';

defineProps({
  contactInfo: { type: Object, required: true }
});
</script>

<style scoped>
.footer-section {
  background-color: #0f172a;
  color: white;
  padding: 80px 0 40px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 60px;
  margin-bottom: 80px;
}

.footer-brand {
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 12px;
  background: linear-gradient(to right, #ffffff, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand-desc {
  color: #94a3b8;
  margin-bottom: 32px;
  font-size: 0.95rem;
}

.contact-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.contact-row {
  display: flex;
  gap: 12px;
  font-size: 0.9rem;
}

.contact-row .label {
  color: #64748b;
  width: 40px;
}

.contact-row .value {
  color: #cbd5e1;
}

.col-title {
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  margin-bottom: 24px;
}

.footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.footer-links li {
  color: #e2e8f0;
  font-size: 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.link-label {
  font-size: 0.8rem;
  color: #64748b;
}

.footer-bottom {
  border-top: 1px solid #1e293b;
  padding-top: 32px;
  text-align: center;
  color: #64748b;
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .footer-grid {
    grid-template-columns: 1fr;
    gap: 40px;
  }
}
</style>
