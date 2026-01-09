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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
// @ts-ignore
import { loadSiteConfig } from '@/config/siteConfig';

import HeroSection from './HeroSection.vue';
import FeaturesSection from './FeaturesSection.vue';
import SystemInfoSection from './SystemInfoSection.vue';
import QuickGuideSection from './QuickGuideSection.vue';
import ContactSection from './ContactSection.vue';

const config = ref(loadSiteConfig());
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
