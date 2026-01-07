import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', {
  state: () => ({
    nextCellToFocus: null // { rowIndex, columnIndex }
  }),

  actions: {
    focusNextCell({ rowIndex, columnIndex }) {
      this.nextCellToFocus = { rowIndex, columnIndex };
    },
    
    clearNextCellFocus() {
      this.nextCellToFocus = null;
    }
  }
});
