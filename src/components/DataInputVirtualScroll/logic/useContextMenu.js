import { reactive, readonly } from 'vue';

const state = reactive({
  visible: false,
  x: 0,
  y: 0,
  items: [],
  target: null // 우클릭된 대상 정보 { rowIndex, colIndex, type }
});

export function useContextMenu() {
  /**
   * 메뉴를 보여줍니다.
   * @param {number} x - x 좌표
   * @param {number} y - y 좌표
   * @param {Array} items - 메뉴 항목 배열
   * @param {object} targetInfo - 우클릭된 대상 정보
   */
  const showContextMenu = (x, y, items, targetInfo) => {
    state.visible = true;
    state.x = x;
    state.y = y;
    state.items = items;
    state.target = targetInfo;
  };

  /**
   * 메뉴를 숨깁니다.
   */
  const hideContextMenu = () => {
    state.visible = false;
    state.items = [];
    state.target = null;
  };

  return {
    contextMenuState: readonly(state),
    showContextMenu,
    hideContextMenu
  };
} 