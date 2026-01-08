<template>
  <footer class="bg-slate-900 text-white py-20 pb-10">
    <div class="max-w-[1200px] mx-auto px-6">
      <div class="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr] gap-12 md:gap-16 mb-20">
        <!-- Brand / Contact -->
        <div class="flex flex-col">
          <h3 class="text-2xl font-extrabold mb-3 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">{{ contactInfo.title }}</h3>
          <p class="text-slate-400 mb-8 text-[0.95rem]">감염병 역학조사 및 현장 대응 연구센터</p>
          <div class="flex flex-col gap-2">
            <div class="flex gap-3 text-sm">
              <span class="text-slate-500 w-10">운영</span>
              <span class="text-slate-300">{{ contactInfo.organization }}</span>
            </div>
            <div class="flex gap-3 text-sm">
              <span class="text-slate-500 w-10">부서</span>
              <span class="text-slate-300">{{ contactInfo.department }}</span>
            </div>
          </div>
        </div>

        <!-- Technical Support -->
        <div class="flex flex-col">
          <h4 class="text-[0.95rem] font-bold uppercase tracking-wider text-slate-400 mb-6">기술 지원</h4>
          <ul class="flex flex-col gap-4">
            <template v-if="contactInfo.support && contactInfo.support.length > 0">
              <li v-for="(person, idx) in contactInfo.support" :key="idx" class="flex flex-col gap-0.5">
                <span class="text-[0.8rem] text-slate-500">{{ person.name }} {{ person.role }}</span>
                <span class="text-slate-200 text-[0.95rem]">{{ person.phone }}</span>
              </li>
            </template>
            <template v-else>
              <li class="flex flex-col gap-0.5">
                <span class="text-[0.8rem] text-slate-500">양정호 책임</span>
              </li>
              <li class="flex flex-col gap-0.5">
                <span class="text-[0.8rem] text-slate-500">최인규 연구원</span>
                <span class="text-slate-200 text-[0.95rem]">061-372-4175</span>
              </li>
            </template>
          </ul>
        </div>
        
        <!-- Email Support -->
        <div class="flex flex-col">
          <h4 class="text-[0.95rem] font-bold uppercase tracking-wider text-slate-400 mb-6">이메일 문의</h4>
          <ul class="flex flex-col gap-3">
            <template v-if="contactInfo.emails && contactInfo.emails.length > 0">
              <li v-for="(email, idx) in contactInfo.emails" :key="idx" class="text-slate-200 text-[0.95rem]">{{ email }}</li>
            </template>
            <template v-else>
              <li class="text-slate-200 text-[0.95rem]">chldlsrb07@gmail.com</li>
            </template>
          </ul>
        </div>
      </div>
      
      <div class="border-t border-slate-800 pt-8 text-center text-slate-500 text-[0.85rem]">
        <p>&copy; 2025 Easy-Epidemiology Web. All rights reserved.</p>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { defineProps } from 'vue';

defineProps({
  contactInfo: { type: Object, required: true }
});
</script>

<style scoped>
/* 반복 스타일 추출 - @apply 활용 */
.footer-heading {
  @apply text-[0.95rem] font-bold uppercase tracking-wider text-slate-400 mb-6;
}

.contact-item {
  @apply flex flex-col gap-0.5;
}

.contact-label {
  @apply text-[0.8rem] text-slate-500;
}

.contact-value {
  @apply text-slate-200 text-[0.95rem];
}

/* 이메일 호버 효과 */
.email-link {
  @apply text-slate-200 text-[0.95rem] transition-colors duration-300 hover:text-blue-400;
}
</style>

