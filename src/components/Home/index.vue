<template>
  <div class="w-full min-h-screen bg-white font-['Noto_Sans_KR',sans-serif]">
    <HeroSection 
      :title="config.basic.title"
      :subtitle="config.basic.subtitle"
      :description="config.basic.description"
    />
    
    <FeaturesSection :features="config.features" />
    
    <SystemInfoSection 
      :basic-config="config.basic"
      :current-date="currentDate"
      :system-features="config.systemFeatures"
      :target-users="config.targetUsers"
      :education="config.education"
      :organization="config.organization"
    />
    
    <QuickGuideSection :steps="config.quickGuide" />
    
    <ContactSection :contact-info="config.contact" />

    <!-- Floating Start Button (Only for Guest) -->
    <Transition
      enter-active-class="transition duration-500 ease-out"
      enter-from-class="translate-y-20 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-20 opacity-0"
    >
      <div v-if="!authStore.isAuthenticated && !hasToken" class="fixed bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none px-6">
        <router-link 
          to="/login" 
          class="pointer-events-auto flex items-center gap-3 px-8 py-4 bg-slate-900/90 hover:bg-slate-800 text-white rounded-full shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-slate-900/30 group border border-slate-700/50"
        >
          <span class="font-bold text-lg tracking-tight">지금 시작하기</span>
          <span class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
            <span class="material-icons text-sm group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
          </span>
        </router-link>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
// @ts-ignore
import { loadSiteConfig } from '@/config/siteConfig';
import { useAuthStore } from '@/stores/authStore';

import HeroSection from './HeroSection.vue';
import FeaturesSection from './FeaturesSection.vue';
import SystemInfoSection from './SystemInfoSection.vue';
import QuickGuideSection from './QuickGuideSection.vue';
import ContactSection from './ContactSection.vue';

const config = ref(loadSiteConfig());
const hasToken = computed(() => !!localStorage.getItem('authToken'));
const authStore = useAuthStore();
const currentDate = ref('');

onMounted(() => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  currentDate.value = `${year}/${month}/${day}`;
});
</script>

<style scoped>
/* Scoped styles replaced by Tailwind utilities */
</style>
