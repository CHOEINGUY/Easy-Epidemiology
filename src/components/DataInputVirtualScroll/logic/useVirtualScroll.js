import { ref, computed } from 'vue';

/**
 * Composable for virtual scrolling.
 *
 * @param {import('vue').Ref<Array<any>>} allRows - A ref to the full list of data rows.
 * @param {object} options - Configuration for virtual scrolling.
 * @param {number} options.rowHeight - The height of a single row in pixels.
 * @param {number} options.bufferSize - The number of extra rows to render above and below the viewport.
 * @param {import('vue').Ref<number>} viewportHeight - The height of the visible area.
 * @returns {object} - Reactive properties and handlers for virtual scrolling.
 */
export function useVirtualScroll(allRows, options) {
  const { rowHeight = 35, bufferSize = 10, viewportHeight } = options;

  const scrollTop = ref(0);

  const totalHeight = computed(() => allRows.value.length * rowHeight);

  const startIndex = computed(() => {
    return Math.max(0, Math.floor(scrollTop.value / rowHeight) - bufferSize);
  });

  const visibleNodeCount = computed(() => {
    if (!viewportHeight.value) return 0;
    return Math.ceil(viewportHeight.value / rowHeight) + 2 * bufferSize;
  });

  const endIndex = computed(() => {
    return Math.min(allRows.value.length - 1, startIndex.value + visibleNodeCount.value);
  });

  const visibleRows = computed(() => {
    return allRows.value.slice(startIndex.value, endIndex.value + 1).map((data, index) => ({
      data,
      originalIndex: startIndex.value + index
    }));
  });
  
  const paddingTop = computed(() => startIndex.value * rowHeight);

  function onScroll(event) {
    scrollTop.value = event.target.scrollTop;
  }

  function getOriginalIndex(virtualIndex) {
    return startIndex.value + virtualIndex;
  }
  
  function getVirtualIndex(originalIndex) {
    if (originalIndex < startIndex.value || originalIndex > endIndex.value) {
      return null; // Not currently visible
    }
    return originalIndex - startIndex.value;
  }

  return {
    visibleRows,
    totalHeight,
    paddingTop,
    onScroll,
    getOriginalIndex,
    getVirtualIndex
  };
} 