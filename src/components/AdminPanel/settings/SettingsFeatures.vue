<template>
  <div class="space-y-10">
    <!-- 기능 카드 설정 -->
    <section class="p-8 bg-slate-50/50 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:shadow-inner-soft group">
      <div class="flex items-center gap-4 mb-8">
        <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary-500 shadow-sm border border-slate-100 transition-transform group-hover:scale-110">
          <span class="material-icons text-2xl">widgets</span>
        </div>
        <h3 class="text-xl font-black text-slate-800 tracking-tight">기능 카드</h3>
      </div>
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div 
          v-for="(feature, index) in localFeatures" 
          :key="index"
          class="p-6 bg-white rounded-3xl border border-slate-100 hover:border-primary-200 hover:shadow-premium transition-all duration-500 group/feature relative overflow-hidden"
        >
          <div class="flex items-center justify-between mb-6">
            <span class="px-3 py-1 bg-primary-500 text-white rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm">#{{ Number(index) + 1 }}</span>
            <button @click="removeFeature(Number(index))" class="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-xl transition-all duration-300 hover:bg-red-500 hover:text-white hover:shadow-lg active:scale-90 shrink-0" title="삭제">
              <span class="material-icons text-base">close</span>
            </button>
          </div>
          <div class="grid grid-cols-[80px_1fr] gap-6">
            <div class="flex flex-col gap-2.5">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">아이콘</label>
              <input v-model="feature.icon" type="text" placeholder="이모지" class="w-full aspect-square bg-slate-50 border border-slate-100 rounded-2xl text-2xl text-center focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 transition-all font-emoji">
            </div>
            <div class="flex flex-col gap-6">
              <div class="flex flex-col gap-2.5">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">제목</label>
                <input v-model="feature.title" type="text" placeholder="기능 제목" class="px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 transition-all">
              </div>
              <div class="flex flex-col gap-2.5">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">설명</label>
                <textarea v-model="feature.description" placeholder="기능에 대한 상세 설명을 입력하세요" class="px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium min-h-[100px] focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 transition-all font-sans leading-relaxed"></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>
      <button @click="addFeature" class="flex items-center justify-center gap-2.5 w-full p-6 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-black text-sm transition-all duration-500 hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50/30 hover:shadow-sm active:scale-[0.99]">
        <span class="material-icons text-2xl">add_circle_outline</span>
        새 기능 카드 추가하기
      </button>
    </section>

    <!-- 시스템 특징 설정 -->
    <section class="p-8 bg-slate-50/50 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:shadow-inner-soft group">
      <div class="flex items-center gap-4 mb-8">
        <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary-500 shadow-sm border border-slate-100 transition-transform group-hover:scale-110">
          <span class="material-icons text-2xl">star</span>
        </div>
        <h3 class="text-xl font-black text-slate-800 tracking-tight">시스템 특징</h3>
      </div>
      <div class="flex flex-wrap gap-4 items-center">
        <div 
          v-for="(feature, index) in localSystemFeatures" 
          :key="index"
          class="flex items-center bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:border-primary-200 focus-within:ring-4 focus-within:ring-primary-500/10 focus-within:border-primary-400 transition-all"
        >
          <input v-model="localSystemFeatures[index]" type="text" class="px-5 py-3 border-none text-[13px] font-bold text-slate-700 min-w-[140px] focus:outline-none bg-transparent">
          <button @click="removeSystemFeature(Number(index))" class="flex items-center justify-center w-10 h-10 bg-slate-50 text-slate-400 border-l border-slate-100 cursor-pointer transition-all hover:bg-red-50 hover:text-red-500 shrink-0" title="삭제">
            <span class="material-icons text-lg">close</span>
          </button>
        </div>
        <button @click="addSystemFeature" class="flex items-center justify-center w-12 h-12 border-2 border-dashed border-slate-200 bg-white rounded-2xl text-slate-400 transition-all duration-300 hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50 active:scale-95 shadow-sm">
          <span class="material-icons text-2xl">add</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps({
  features: {
    type: Array, // localConfig.features
    required: true
  },
  systemFeatures: {
    type: Array, // localConfig.systemFeatures
    required: true
  }
});

const emit = defineEmits(['update:features', 'update:systemFeatures']);

const localFeatures = ref(JSON.parse(JSON.stringify(props.features)));
const localSystemFeatures = ref(JSON.parse(JSON.stringify(props.systemFeatures)));

watch(() => props.features, (newVal) => { localFeatures.value = JSON.parse(JSON.stringify(newVal)); }, { deep: true });
watch(() => props.systemFeatures, (newVal) => { localSystemFeatures.value = JSON.parse(JSON.stringify(newVal)); }, { deep: true });

watch(localFeatures, (newVal) => { emit('update:features', newVal); }, { deep: true });
watch(localSystemFeatures, (newVal) => { emit('update:systemFeatures', newVal); }, { deep: true });

function addFeature() {
  localFeatures.value.push({ icon: '', title: '', description: '' });
}

function removeFeature(index: number) {
  localFeatures.value.splice(index, 1);
}

function addSystemFeature() {
  localSystemFeatures.value.push('');
}

function removeSystemFeature(index: number) {
  localSystemFeatures.value.splice(index, 1);
}
</script>
