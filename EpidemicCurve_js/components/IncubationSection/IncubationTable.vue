<template>
  <div class="flex flex-col flex-1">
    <div class="flex items-center justify-between mx-5 mt-5 mb-2.5">
      <div class="flex items-center text-[1.1em] text-[#333] font-medium text-left">
        <span class="inline-block w-[0.3em] h-[0.3em] bg-current mr-[0.3em] align-middle rounded-full"></span>
        <span class="ml-[0.2em]">예상 잠복 기간별 환자 수</span>
      </div>
      <div class="relative group">
        <button @click="handleCopyTable" class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm cursor-pointer">
          <span class="flex items-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </span>
          <span class="font-['Noto_Sans_KR'] font-normal">복사</span>
        </button>
        <transition enter-active-class="transition ease-out duration-200" enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition ease-in duration-150" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-1">
          <div v-if="isTableCopied" class="absolute left-1/2 top-[110%] -translate-x-1/2 z-10 pointer-events-none flex items-center justify-center w-8 h-8 rounded-full shadow-sm bg-white border border-slate-100">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="12" fill="#1a73e8"/>
              <polyline points="7,13 11,17 17,9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </transition>
      </div>
    </div>

    <table id="incubation-table" v-if="tableData.length > 0" class="w-[calc(100%-40px)] text-sm border-collapse mx-5 mb-5 border border-slate-200">
      <thead>
        <tr>
          <th class="bg-slate-50 font-semibold p-2 border border-slate-200 text-slate-700">예상 잠복 기간</th>
          <th class="bg-slate-50 font-semibold p-2 border border-slate-200 text-slate-700">수</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in tableData" :key="'incubation-' + index" class="hover:bg-slate-50/50">
          <td class="p-2 border border-slate-200 text-center text-slate-600">{{ item.intervalLabel }}</td>
          <td class="p-2 border border-slate-200 text-center text-slate-600">{{ item.count }}</td>
        </tr>
      </tbody>
    </table>

    <div v-else class="p-5 text-center text-[#666]">
      <DataGuideMessage
        v-if="!hasExposureDateTime && !isIndividualExposureColumnVisible"
        icon="event"
        title="의심원 노출시간을 설정해주세요"
        description="잠복기 분석을 위해 기준이 되는 의심원 노출시간을 설정해야 합니다."
        :steps="exposureGuideSteps"
      />
      <DataGuideMessage
        v-else
        icon="schedule"
        title="증상 발현 시간 데이터가 필요합니다"
        description="유행곡선을 생성하려면 환자들의 증상 발현 시간 정보가 필요합니다."
        :steps="symptomGuideSteps"
      />
    </div>

    <div class="flex items-center text-[1.1em] text-[#333] font-medium text-left mx-5 mt-5">
      <span class="inline-block w-[0.3em] h-[0.3em] bg-current mr-[0.3em] align-middle rounded-full"></span>
      <span class="ml-[0.2em]">잠복기 요약 정보</span>
    </div>

    <div class="mx-5 mb-5 mt-5 p-4 bg-[#f8f9fa] rounded-lg border border-slate-100">
      <div class="flex items-center gap-2.5 mb-2 last:mb-0">
        <span class="text-sm text-[#666] min-w-[100px]">최소 잠복기 :</span>
        <span class="text-sm text-[#333] font-medium">{{ minIncubation }}</span>
      </div>
      <div class="flex items-center gap-2.5 mb-2 last:mb-0">
        <span class="text-sm text-[#666] min-w-[100px]">최대 잠복기 :</span>
        <span class="text-sm text-[#333] font-medium">{{ maxIncubation }}</span>
      </div>
      <div class="flex items-center gap-2.5 mb-2 last:mb-0">
        <span class="text-sm text-[#666] min-w-[100px]">평균 잠복기 :</span>
        <span class="text-sm text-[#333] font-medium">{{ avgIncubation }}</span>
      </div>
      <div class="flex items-center gap-2.5 mb-2 last:mb-0">
        <span class="text-sm text-[#666] min-w-[100px]">중앙 잠복기 :</span>
        <span class="text-sm text-[#333] font-medium">{{ medianIncubation }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import DataGuideMessage from '../../../DataGuideMessage.vue';
import { useClipboardOperations } from '../../composables/useClipboardOperations';

// 안내 메시지 steps
const exposureGuideSteps = [
  { number: '1', text: '위의 의심원 노출시간 입력란을 클릭하세요' },
  { number: '2', text: '모든 환자에게 공통으로 적용될 기준 노출시간을 설정하세요' },
  { number: '3', text: '설정 후 잠복기 분석이 자동으로 시작됩니다' }
];

const symptomGuideSteps = [
  { number: '1', text: '데이터 입력 화면에서 증상발현시간 열에 시간을 입력하세요' },
  { number: '2', text: '최소 2명 이상의 환자 데이터가 필요합니다' },
  { number: '3', text: '시간 형식: YYYY-MM-DD HH:MM (예: 2024-01-15 14:30)' }
];

defineProps({
  tableData: {
    type: Array,
    required: true
  },
  minIncubation: {
    type: String,
    default: '--:--'
  },
  maxIncubation: {
    type: String,
    default: '--:--'
  },
  avgIncubation: {
    type: String,
    default: '--:--'
  },
  medianIncubation: {
    type: String,
    default: '--:--'
  },
  hasExposureDateTime: {
    type: Boolean,
    default: false
  },
  isIndividualExposureColumnVisible: {
    type: Boolean,
    default: false
  }
});

const { isIncubationTableCopied, copyIncubationTableToClipboard } = useClipboardOperations();
const isTableCopied = isIncubationTableCopied;

const handleCopyTable = () => {
  copyIncubationTableToClipboard();
};
</script>
