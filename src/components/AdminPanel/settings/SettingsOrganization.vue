<template>
  <section class="p-8 bg-slate-50/50 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:shadow-inner-soft group">
    <div class="flex items-center gap-4 mb-8">
      <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary-500 shadow-sm border border-slate-100 transition-transform group-hover:scale-110">
        <span class="material-icons text-2xl">business</span>
      </div>
      <h3 class="text-xl font-black text-slate-800 tracking-tight">조직 정보</h3>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="flex flex-col gap-2.5">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">기관명</label>
        <input v-model="localConfig.name" type="text" class="px-5 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm font-semibold text-slate-800 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 shadow-sm">
      </div>
      <div class="flex flex-col gap-2.5">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">부서</label>
        <input v-model="localConfig.department" type="text" class="px-5 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm font-semibold text-slate-800 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 shadow-sm">
      </div>
      <div class="flex flex-col gap-2.5">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">센터명</label>
        <input v-model="localConfig.center" type="text" class="px-5 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm font-semibold text-slate-800 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 shadow-sm">
      </div>
    </div>
    
    <div class="mt-10 pt-8 border-t border-slate-200/60">
      <div class="flex items-center gap-3 mb-6 text-slate-500">
        <span class="material-icons text-2xl">groups</span>
        <h4 class="text-[13px] font-black text-slate-600 uppercase tracking-widest">팀원 정보</h4>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div 
          v-for="(member, index) in localConfig.team" 
          :key="index"
          class="flex items-center gap-3 p-4 bg-white rounded-2.5xl border border-slate-100 hover:border-primary-200 hover:shadow-md transition-all duration-300 group/member"
        >
          <div class="flex flex-1 gap-3">
            <input v-model="member.role" type="text" placeholder="역할" class="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-1.5xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 focus:bg-white transition-all">
            <input v-model="member.name" type="text" placeholder="이름" class="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-1.5xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 focus:bg-white transition-all">
          </div>
          <button @click="removeTeamMember(Number(index))" class="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-xl transition-all duration-300 hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/20 active:scale-90 shrink-0" title="삭제">
            <span class="material-icons text-lg">close</span>
          </button>
        </div>
      </div>
      <button @click="addTeamMember" class="flex items-center justify-center gap-2.5 w-full p-4.5 bg-white border-2 border-dashed border-slate-200 rounded-2.5xl text-slate-400 font-black text-sm transition-all duration-300 hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50/30 hover:shadow-sm active:scale-[0.99]">
        <span class="material-icons text-xl">add_circle_outline</span>
        팀원 추가하기
      </button>
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

// Be careful with deep clone of team array to avoid reference issues
const localConfig = ref(JSON.parse(JSON.stringify(props.config)));

watch(() => props.config, (newVal) => {
  // Only update if different to avoid cursor jumps if feasible, but deep sync is safest
  localConfig.value = JSON.parse(JSON.stringify(newVal));
}, { deep: true });

watch(localConfig, (newVal) => {
  emit('update:config', newVal);
}, { deep: true });

function addTeamMember() {
  localConfig.value.team.push({ role: '', name: '' });
}

function removeTeamMember(index: number) {
  localConfig.value.team.splice(index, 1);
}
</script>
