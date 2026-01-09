<template>
  <section class="p-8 bg-slate-50/50 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:shadow-inner-soft group">
    <div class="flex items-center gap-4 mb-8">
      <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary-500 shadow-sm border border-slate-100 transition-transform group-hover:scale-110">
        <span class="material-icons text-2xl">info</span>
      </div>
      <h3 class="text-xl font-black text-slate-800 tracking-tight">기본 정보</h3>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="flex flex-col gap-2.5">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">제목</label>
        <input v-model="localConfig.title" type="text" class="px-5 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm font-semibold text-slate-800 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 shadow-sm">
      </div>
      <div class="flex flex-col gap-2.5">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">부제목</label>
        <input v-model="localConfig.subtitle" type="text" class="px-5 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm font-semibold text-slate-800 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 shadow-sm">
      </div>
      <div class="flex flex-col gap-2.5 md:col-span-2 lg:col-span-3">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">설명</label>
        <textarea v-model="localConfig.description" class="px-5 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-medium text-slate-800 min-h-[120px] resize-y transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 shadow-sm font-sans"></textarea>
      </div>
      <div class="flex flex-col gap-2.5">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">버전</label>
        <input v-model="localConfig.version" type="text" class="px-5 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm font-semibold text-slate-800 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 shadow-sm">
      </div>
      <div class="flex flex-col gap-2.5">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">최종 업데이트</label>
        <input v-model="localConfig.lastUpdate" type="text" class="px-5 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm font-semibold text-slate-800 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 shadow-sm">
      </div>
      <div class="flex flex-col gap-2.5">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">플랫폼</label>
        <input v-model="localConfig.platform" type="text" class="px-5 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm font-semibold text-slate-800 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 shadow-sm">
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps({
  config: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:config']);

const localConfig = ref({ ...props.config });

watch(() => props.config, (newVal) => {
  localConfig.value = { ...newVal };
}, { deep: true });

watch(localConfig, (newVal) => {
  emit('update:config', newVal);
}, { deep: true });
</script>
