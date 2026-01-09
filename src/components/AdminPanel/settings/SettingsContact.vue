<template>
  <div class="space-y-10">
    <!-- 연락처 설정 - 기술 지원 -->
    <section class="p-8 bg-slate-50/50 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:shadow-inner-soft group">
      <div class="flex items-center gap-4 mb-8">
        <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary-500 shadow-sm border border-slate-100 transition-transform group-hover:scale-110">
          <span class="material-icons text-2xl">support_agent</span>
        </div>
        <h3 class="text-xl font-black text-slate-800 tracking-tight">기술 지원</h3>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div 
          v-for="(person, index) in localConfig.support" 
          :key="index"
          class="p-6 bg-white rounded-3xl border border-slate-100 hover:border-primary-200 hover:shadow-premium transition-all duration-300 group/person relative"
        >
          <button @click="removeSupportContact(Number(index))" class="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-xl transition-all duration-300 hover:bg-red-500 hover:text-white hover:shadow-lg active:scale-90 opacity-0 group-hover/person:opacity-100 z-10" title="삭제">
            <span class="material-icons text-base">close</span>
          </button>
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">이름</label>
              <input v-model="person.name" type="text" placeholder="이름" class="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-1.5xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 focus:bg-white transition-all">
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">직함/역할</label>
              <input v-model="person.role" type="text" placeholder="예: 책임, 연구원" class="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-1.5xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 focus:bg-white transition-all">
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">전화번호</label>
              <input v-model="person.phone" type="text" placeholder="000-000-0000" class="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-1.5xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 focus:bg-white transition-all">
            </div>
          </div>
        </div>
        <button @click="addSupportContact" class="flex flex-col items-center justify-center gap-3 p-8 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 transition-all duration-300 hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50/30 hover:shadow-sm active:scale-[0.98]">
          <span class="material-icons text-3xl">add_circle_outline</span>
          <span class="text-sm font-black">담당자 추가</span>
        </button>
      </div>
    </section>

    <!-- 연락처 설정 - 이메일 -->
    <section class="p-8 bg-slate-50/50 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:shadow-inner-soft group">
      <div class="flex items-center gap-4 mb-8">
        <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary-500 shadow-sm border border-slate-100 transition-transform group-hover:scale-110">
          <span class="material-icons text-2xl">mail</span>
        </div>
        <h3 class="text-xl font-black text-slate-800 tracking-tight">이메일 문의</h3>
      </div>
      
      <div class="flex flex-wrap gap-4 items-center mb-4">
        <div 
          v-for="(email, index) in localConfig.emails" 
          :key="index"
          class="flex items-center bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:border-primary-200 focus-within:ring-4 focus-within:ring-primary-500/10 focus-within:border-primary-400 transition-all"
        >
          <input v-model="localConfig.emails[index]" type="email" placeholder="example@mail.com" class="px-5 py-3 border-none text-[13px] font-bold text-slate-700 min-w-[240px] focus:outline-none bg-transparent">
          <button @click="removeEmail(Number(index))" class="flex items-center justify-center w-10 h-10 bg-slate-50 text-slate-400 border-l border-slate-100 cursor-pointer transition-all hover:bg-red-50 hover:text-red-500 shrink-0" title="삭제">
            <span class="material-icons text-lg">close</span>
          </button>
        </div>
        <button @click="addEmail" class="flex items-center justify-center w-12 h-12 border-2 border-dashed border-slate-200 bg-white rounded-2xl text-slate-400 transition-all duration-300 hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50 active:scale-95 shadow-sm">
          <span class="material-icons text-2xl">add</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps({
  config: {
    type: Object, // localConfig.contact
    required: true
  }
});

const emit = defineEmits(['update:config']);

const localConfig = ref(JSON.parse(JSON.stringify(props.config)));

watch(() => props.config, (newVal) => { localConfig.value = JSON.parse(JSON.stringify(newVal)); }, { deep: true });
watch(localConfig, (newVal) => { emit('update:config', newVal); }, { deep: true });

function addSupportContact() {
  if (!localConfig.value.support) {
    localConfig.value.support = [];
  }
  localConfig.value.support.push({ name: '', role: '', phone: '' });
}

function removeSupportContact(index: number) {
  localConfig.value.support.splice(index, 1);
}

function addEmail() {
  if (!localConfig.value.emails) {
    localConfig.value.emails = [];
  }
  localConfig.value.emails.push('');
}

function removeEmail(index: number) {
  localConfig.value.emails.splice(index, 1);
}
</script>
