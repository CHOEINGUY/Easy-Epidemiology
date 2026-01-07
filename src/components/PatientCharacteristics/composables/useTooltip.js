// useTooltip.js - 툴팁 상태 관리
import { ref } from 'vue';

export function useTooltip() {
  const activeTooltip = ref(null);
  const tooltipText = ref('');

  const showTooltip = (key, text) => {
    activeTooltip.value = key;
    tooltipText.value = text;
  };

  const hideTooltip = () => {
    activeTooltip.value = null;
  };

  return {
    activeTooltip,
    tooltipText,
    showTooltip,
    hideTooltip
  };
}
