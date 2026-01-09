<template>
  <div class="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" @click="$emit('close')">
    <div class="bg-white rounded-3xl p-8 md:p-10 max-w-[440px] w-full text-center shadow-2xl shadow-slate-900/20 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300" @click.stop>
      <div class="mb-6 flex justify-center">
        <div class="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
          <span class="material-icons text-emerald-500 text-5xl">check_circle</span>
        </div>
      </div>
      <h3 class="text-2xl font-bold text-slate-900 mb-4 tracking-tight">회원가입이 완료되었습니다!</h3>
      <p class="text-slate-500 leading-relaxed mb-8">
        입력하신 정보가 정상적으로 등록되었습니다.<br>
        <strong class="text-slate-900 font-bold">상위 기관의 승인을 기다려주세요.</strong><br>
        승인 완료 후 로그인이 가능합니다.
      </p>
      <div class="flex justify-center">
        <button 
          class="w-full py-4 bg-slate-900 text-white font-bold rounded-xl text-[15px] shadow-lg shadow-slate-900/10 transition-all duration-200 hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0"
          @click="$emit('close')"
        >
          확인
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  (e: 'close'): void;
}>();
</script>

<style scoped>
/* All styles handled via Tailwind */
</style>
