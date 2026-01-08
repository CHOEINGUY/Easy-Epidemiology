<template>
  <div class="flex flex-col w-full h-full">
    <div class="flex justify-between items-center px-5 py-4 border-b border-slate-100">
      <span class="flex items-center text-slate-800 font-semibold text-base">
        <span class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></span>{{ headerName === "" ? "(없음)" : headerName }}
      </span>
      <SharedIconButton
        icon="copy"
        label="테이블 복사"
        :showSuccess="isTableCopied"
        @click="handleCopyTable"
      />
    </div>
    <div class="overflow-auto flex-1 p-0">
      <table class="w-full text-sm text-center border-collapse frequency-table">
        <thead class="bg-slate-50 sticky top-0 z-10">
          <tr>
            <th class="py-3 px-4 font-semibold text-slate-600 border-b border-slate-200">구분</th>
            <th class="py-3 px-4 font-semibold text-slate-600 border-b border-slate-200">대상자수</th>
            <th class="py-3 px-4 font-semibold text-slate-600 border-b border-slate-200">대상자비율</th>
            <th class="py-3 px-4 font-semibold text-slate-600 border-b border-slate-200">환자수</th>
            <th class="py-3 px-4 font-semibold text-slate-600 border-b border-slate-200">환자비율</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(data, category) in frequencyData" :key="category" class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
            <td class="py-3 px-4 text-slate-700">{{ category }}</td>
            <td class="py-3 px-4 text-slate-600">{{ data.count }}</td>
            <td class="py-3 px-4 text-slate-600">{{ data.totalPercentage.toFixed(1) }}%</td>
            <td class="py-3 px-4 text-slate-600">{{ data.patientCount }}</td>
            <td class="py-3 px-4 text-slate-600">{{ data.patientPercentage.toFixed(1) }}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
// FrequencyTable.vue - 빈도 테이블 컴포넌트
import { useClipboardOperations } from '../composables/useClipboardOperations';
import SharedIconButton from './SharedIconButton.vue';

defineProps({
  headerName: {
    type: String,
    required: true
  },
  frequencyData: {
    type: Object,
    required: true
  }
});

const { isTableCopied, copyTableToClipboard } = useClipboardOperations();

const handleCopyTable = () => {
  copyTableToClipboard();
};
</script>
