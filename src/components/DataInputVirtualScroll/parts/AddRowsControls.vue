<template>
  <div class="add-rows-controls">
    <span class="add-rows-button" @click="emitAdd">하단에</span>
    <input
      v-model.number="rowsToAdd"
      type="number"
      min="1"
      class="rows-count-input"
      aria-label="추가할 행 수"
      @focus="emit('clear-selection')"
      @keydown.enter.prevent="emitAdd"
    />
    <span class="add-rows-label">개의 행 추가</span>
    <button
      class="delete-empty-rows-button"
      aria-label="빈 행 삭제"
      @click="emitDeleteEmpty"
    >
      <span class="material-icons-outlined delete-empty-rows-button-icon">delete_outline</span>
      빈 행 삭제
    </button>
  </div>
</template>

<script setup>
import { ref, defineEmits } from 'vue';

const emit = defineEmits(['add-rows', 'delete-empty-rows', 'clear-selection']);
const rowsToAdd = ref(10);

function emitAdd() {
  if (rowsToAdd.value >= 1) {
    emit('add-rows', rowsToAdd.value);
    rowsToAdd.value = 10;
  }
}

function emitDeleteEmpty() {
  emit('delete-empty-rows');
}
</script>

<style scoped>
.add-rows-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%; /* allow right align for delete button */
}

.add-rows-button {
  margin-left: 15px;
  margin-right: 5px;
  font-size: 0.95em;
  color: #1a73e8;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  transition: background-color 0.2s ease;
  user-select: none;
}

.add-rows-button:hover {
  background-color: rgba(26, 115, 232, 0.1);
}

.rows-count-input {
  width: 50px;
  padding: 4px;
  border: 1px solid #ccc;
  border-radius: 4px;
  text-align: center;
  font-size: 14px;
  -moz-appearance: textfield;
}

.rows-count-input::-webkit-inner-spin-button,
.rows-count-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.add-rows-label {
  font-size: 0.95em;
  color: #333;
}

.delete-empty-rows-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: transparent;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 400;
  color: #3c4043;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  margin-left: auto; /* push to right */
}

.delete-empty-rows-button:hover {
  background: #f1f3f4;
  color: #d93025;
}

.delete-empty-rows-button:active {
  background: #e8eaed;
}

.delete-empty-rows-button-icon {
  font-size: 18px;
  color: #5f6368;
  flex-shrink: 0;
}

.delete-empty-rows-button:hover .delete-empty-rows-button-icon {
  color: #d93025;
}
</style> 