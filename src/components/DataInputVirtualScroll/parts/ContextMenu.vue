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
@import './ContextMenu.css';
</style>
 