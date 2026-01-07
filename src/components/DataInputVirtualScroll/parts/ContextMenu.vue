<template>
  <div
    v-if="visible"
    ref="menuRef"
    class="context-menu"
    :style="menuStyle"
    @contextmenu.prevent
    @mousedown.stop
  >
    <template v-for="(item, index) in items" :key="index">
      <div v-if="item.type === 'separator'" class="context-menu-separator"></div>
      <div
        v-else-if="item.type === 'checkbox'"
        class="context-menu-item"
        @click="onItemClick(item)"
      >
        <input type="checkbox" :checked="item.checked" readonly style="margin-right:6px;pointer-events:none;" />
        <span class="context-menu-text">{{ getLabelText(item.label) }}</span>
        <span v-if="getCountText(item.label)" class="context-menu-count">{{ getCountText(item.label) }}</span>
      </div>
      <div
        v-else
        class="context-menu-item"
        :class="{ 'is-disabled': item.disabled, 'is-danger': item.danger }"
        @click="onItemClick(item)"
      >
        <span v-if="item.icon" class="context-menu-icon">{{ item.icon }}</span>
        <span class="context-menu-text">{{ item.label }}</span>
        <span v-if="item.shortcut" class="context-menu-shortcut">{{ item.shortcut }}</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, watch, nextTick, computed, defineProps, defineEmits } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  x: {
    type: Number,
    default: 0
  },
  y: {
    type: Number,
    default: 0
  },
  items: {
    type: Array,
    default: () => [] // 예: [{ label: 'Copy', action: 'copy', icon: '©' }]
  }
});

const emit = defineEmits(['select']);

const menuRef = ref(null);
const position = reactive({ x: 0, y: 0, opacity: 0 });

const menuStyle = computed(() => ({
  left: `${position.x}px`,
  top: `${position.y}px`,
  opacity: position.opacity
}));

const adjustPosition = () => {
  if (!menuRef.value) return;
  const menuWidth = menuRef.value.offsetWidth;
  const menuHeight = menuRef.value.offsetHeight;
  const { innerWidth: vpWidth, innerHeight: vpHeight } = window;

  let newX = props.x;
  if (props.x + menuWidth > vpWidth) {
    newX = props.x - menuWidth;
  }

  let newY = props.y;
  if (props.y + menuHeight > vpHeight) {
    newY = props.y - menuHeight;
  }

  position.x = Math.max(0, newX);
  position.y = Math.max(0, newY);
  position.opacity = 1;
};

watch(() => [props.visible, props.x, props.y], ([isVisible, newX, newY], [wasVisible, oldX, oldY] = []) => {
  if (isVisible) {
    // 메뉴가 처음 보이거나, 이미 보이는 상태에서 위치가 변경되었을 때
    if (!wasVisible || newX !== oldX || newY !== oldY) {
      // 위치를 재계산하기 전에 메뉴를 잠시 투명하게 만듭니다.
      position.opacity = 0;
      nextTick(adjustPosition);
    }
  }
}, { immediate: true });

const onItemClick = (item) => {
  if (item.disabled) return;
  emit('select', item.action);
};

// 괄호 부분을 분리하는 함수들
const getLabelText = (label) => {
  const match = label.match(/^(.+?)\s*\(\d+\)$/);
  return match ? match[1] : label;
};

const getCountText = (label) => {
  const match = label.match(/\((\d+)\)$/);
  return match ? `${match[1]}개` : '';
};
</script>

<style scoped>
/* 컨텍스트 메뉴 스타일 (구버전과 동일하게) */
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #dadce0;
  border-radius: 4px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: 10001;
  min-width: 140px;
  padding: 6px 0;
  animation: contextMenuFadeIn 0.15s ease-out;
  transition: opacity 0.1s ease;
  user-select: none;
}

.context-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 14px;
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.context-menu-item:hover {
  background-color: #f1f3f4;
}

.context-menu-item.is-disabled {
  color: #a7a7a7;
  cursor: not-allowed;
  background-color: transparent !important;
}

.context-menu-item.is-danger:not(.is-disabled) {
  color: #dc3545;
}

.context-menu-item.is-danger:not(.is-disabled):hover {
  background-color: #f8d7da;
  color: #721c24;
}

.context-menu-icon {
  margin-right: 12px;
  font-size: 16px;
  width: 16px;
  text-align: center;
}

.context-menu-text {
  font-size: 13px;
  color: #202124;
  font-family: "Google Sans", Roboto, Arial, sans-serif;
  flex-grow: 1;
}

.context-menu-shortcut {
  color: #70757a;
  font-size: 12px;
}

.context-menu-count {
  color: #70757a;
  font-size: 11px;
  margin-left: auto;
  padding-left: 8px;
}

.context-menu-separator {
  height: 1px;
  background-color: #e0e0e0;
  margin: 6px 0;
}

@keyframes contextMenuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style> 