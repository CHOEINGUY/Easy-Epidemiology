<template>
  <div class="bg-white rounded-3.5xl border border-slate-100 shadow-premium overflow-hidden transition-all duration-300">
    <!-- Header Section -->
    <div class="flex items-center gap-6 p-8 md:p-10 bg-gradient-to-br from-slate-900 to-slate-800 relative overflow-hidden">
      <!-- Decorative element -->
      <div class="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
      
      <div class="w-16 h-16 bg-white/10 rounded-2.5xl flex items-center justify-center text-primary-400 backdrop-blur-md border border-white/10 relative z-10 shadow-lg">
        <span class="material-icons text-3xl">tune</span>
      </div>
      <div class="flex flex-col gap-1.5 relative z-10">
        <h2 class="text-2xl md:text-3xl font-black text-white leading-tight tracking-tight">사이트 설정 관리</h2>
        <p class="text-slate-400 font-medium text-sm md:text-base">홈페이지의 정보를 동적으로 관리할 수 있습니다.</p>
      </div>
    </div>
    
    <div class="p-8 md:p-10 space-y-10">
      <!-- 기본 정보 -->
      <SettingsBasic 
        :config="localConfig.basic" 
        @update:config="localConfig.basic = $event"
      />
 
      <!-- 조직 정보 -->
      <SettingsOrganization 
        :config="localConfig.organization" 
        @update:config="localConfig.organization = $event"
      />
 
      <!-- 기능 및 시스템 특징 -->
      <SettingsFeatures 
        :features="localConfig.features" 
        :systemFeatures="localConfig.systemFeatures"
        @update:features="localConfig.features = $event"
        @update:systemFeatures="localConfig.systemFeatures = $event"
      />
 
      <!-- 연락처 및 지원 -->
      <SettingsContact 
        :config="localConfig.contact" 
        @update:config="localConfig.contact = $event"
      />

      <!-- 저장 버튼 -->
      <div class="flex flex-col md:flex-row justify-end gap-5 mt-12 pt-8 border-t border-slate-200/60">
        <button @click="$emit('reset')" class="flex items-center justify-center gap-2.5 px-8 py-4.5 bg-white border border-slate-200 text-slate-500 rounded-2.5xl font-black text-sm transition-all duration-300 hover:border-red-400 hover:text-red-500 hover:bg-red-50 hover:shadow-sm active:scale-95 group">
          <span class="material-icons text-xl transition-transform group-hover:rotate-[-120deg]">restore</span>
          기본값으로 복원
        </button>
        <button @click="handleSave" class="flex items-center justify-center gap-3 px-10 py-4.5 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-2.5xl font-black text-[15px] shadow-premium shadow-primary-500/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/30 active:translate-y-0 active:scale-95 group relative overflow-hidden">
          <span class="relative z-10 material-icons text-xl">save</span>
          <span class="relative z-10">모든 설정 저장하기</span>
          <!-- Shine effect -->
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import SettingsBasic from './settings/SettingsBasic.vue';
import SettingsOrganization from './settings/SettingsOrganization.vue';
import SettingsFeatures from './settings/SettingsFeatures.vue';
import SettingsContact from './settings/SettingsContact.vue';

const props = defineProps({
  config: { type: Object, required: true }
});

const emit = defineEmits(['update:config', 'save', 'reset']);

// Clone deep helper or local ref for editing
const localConfig = ref(JSON.parse(JSON.stringify(props.config)));

// Only sync from parent when props change (e.g., after reset)
watch(() => props.config, (newVal) => {
  // Avoid unnecessary updates if the object is the same reference
  if (JSON.stringify(newVal) !== JSON.stringify(localConfig.value)) {
    localConfig.value = JSON.parse(JSON.stringify(newVal));
  }
}, { deep: true });

// Emit final config only when user explicitly saves
function handleSave() {
  emit('update:config', JSON.parse(JSON.stringify(localConfig.value)));
  emit('save');
}
</script>

<style scoped>
/* All styles handled via Tailwind */
</style>
