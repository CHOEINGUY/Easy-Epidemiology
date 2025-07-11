# Filter Feature Development Plan

This document outlines a detailed, step-by-step plan for implementing filter functionality in the `DataInputVirtual.vue` component. The goal is to add column-based filtering (similar to Google Sheets or Excel) without disrupting existing features such as virtual scrolling, undo/redo, validation, selection system, context menus, and data editing. Filters will be applied to specific column types: binary (0/1) for patient status, symptoms, diet, and confirmed cases; arbitrary text for basic info; and date/time for exposure columns.

The implementation will prioritize:
- **Natural Integration**: Filters should feel intuitive, like in Excel (e.g., dropdown menus on headers with checkboxes for unique values or search inputs).
- **Compatibility**: No breaking changes to existing logic. Filters will be non-destructive (they hide rows temporarily without modifying data).
- **Performance**: Leverage existing virtual scrolling and workers to handle large datasets efficiently.
- **Undo/Redo**: Filters are UI states, not data changes, so they won't be part of history. But data edits while filtered will be undoable.

## Step 1: Requirements Analysis and Scope Definition (Planning Phase)
- **Analyze Column Types**:
  - Binary columns (patient status, symptoms, diet, confirmed cases): Filter by 0/1 (checkboxes: "Show 0", "Show 1", "Show blanks").
  - Basic info columns: Text search (contains, exact match) or unique value checkboxes.
  - Date/time columns (individual exposure, symptom onset): Date range picker or predefined ranges (e.g., last 7 days).
  - Multi-column filters: Support combining filters across columns (AND logic by default).
- **Scope**:
  - Per-column filters via header dropdowns.
  - Global filter bar for quick searches (optional, Phase 2).
  - Clear all filters button.
  - Persist filters in localStorage for session continuity (but not in undo/redo).
- **Edge Cases**:
  - Empty data sets.
  - Filters reducing rows to zero.
  - Interactions with selection, editing, and validation.
- **Success Criteria**: Filters should not cause re-renders that break virtual scrolling or increase load times >10% on 10k rows.

**Duration**: 1-2 hours. Output: Updated requirements doc or tickets.

## Step 2: UI Design and Component Updates (Setup Phase)
- **Modify VirtualGridHeader.vue**:
  - Add a filter icon (e.g., funnel SVG) to each editable column header.
  - On click, show a dropdown menu (use Vue's `<teleport>` or a new `FilterDropdown.vue` component).
- **Create New Components**:
  - `FilterDropdown.vue`: Handles filter UI based on column type (checkboxes for binary, input for text, date picker for dates).
  - Use existing `DateTimePicker.vue` for date filters.
- **Integrate with VirtualFunctionBar.vue**:
  - Add a "Clear Filters" button.
- **Styling**:
  - Match existing grid styles (e.g., z-index above grid, positioning relative to header).
  - Ensure dropdown doesn't overlap with context menus or editing cells.

**Compatibility Check**: Test that adding icons doesn't affect header widths or scrolling sync.
**Duration**: 4-6 hours. Output: Updated Vue components with placeholder UI.

## Step 3: State Management for Filters (Data Layer)
- **Use Vuex or Local State**:
  - Add a `filters` object in StoreBridge (e.g., `{ colIndex: { type: 'binary', values: [0,1] } }`).
  - Make it reactive (ref/computed in DataInputVirtual.vue).
  - Persist via enhancedStorageManager.js (but exclude from undo/redo history).
- **Computed Filtered Rows**:
  - In DataInputVirtual.vue, create `filteredRows = computed(() => rows.value.filter(row => applyFilters(row)))`.
  - Pass `filteredRows` to `useVirtualScroll` instead of raw `rows`.
  - Update `getOriginalIndex` to map virtual indices to original row indices (for editing/validation).
- **Filter Application Logic**:
  - Define `applyFilters(row)` function that checks row against all active filters.
  - For performance, debounce filter updates (lodash debounce, 300ms).

**Compatibility Check**: Ensure undo/redo restores data without affecting active filters. Validation should run on filtered view but store errors on original indices.
**Duration**: 3-5 hours. Output: Reactive filter state and basic apply logic.

## Step 4: Integrate with Existing Features (Core Implementation)
- **Virtual Scrolling (useVirtualScroll.js)**:
  - Modify hook to accept dynamic rows (filteredRows).
  - Recalculate totalHeight and paddingTop on filter changes.
  - Preserve scroll position if possible (e.g., scroll to first visible row after filtering).
- **Selection System (virtualSelectionSystem.js)**:
  - Map selections to original row indices (e.g., selectedCell.rowIndex is always original).
  - Clear selections on filter apply if they become invalid.
- **Validation (ValidationManager.js)**:
  - Run validations on original data, but display errors only on visible (filtered) rows.
  - Add method to revalidate visible rows efficiently.
- **Undo/Redo (useUndoRedo.js)**:
  - Filters are not undoable; treat them as UI state.
  - Ensure data edits while filtered are captured in history (using original indices).
- **Editing and Input**:
  - When editing a cell in filtered view, save to original row.
  - Close open editors (e.g., DateTimePicker) on filter apply.
- **Context Menus and Other Interactions**:
  - Disable or adjust menu items (e.g., "delete rows") to operate on original data, not filtered view.
  - Add "Apply to filtered" option if needed.

**Compatibility Check**: Run full regression tests on existing features (e.g., excel upload, undo/redo cycles, validation progress).
**Duration**: 6-8 hours. Output: Fully integrated filter logic.

## Step 5: Performance Optimization and Edge Case Handling
- **Optimize for Large Datasets**:
  - Use Web Workers (extend validationWorker.js) for filter computation if rows > 5k.
  - Memoize filter results with computed.
- **Handle Edge Cases**:
  - No rows after filter: Show message like "No results match filters".
  - Filter during editing: Auto-save or prompt.
  - Multi-user/session: Filters are per-session.
- **Accessibility**: Add ARIA labels to filter UI.

**Duration**: 2-4 hours. Output: Optimized code with handling for 10k+ rows.

## Step 6: Testing and QA
- **Unit Tests**: Add to tests/ (e.g., filter logic, state persistence).
- **Integration Tests**: Test with existing flows (upload, edit, validate, export).
- **Manual QA**: Simulate Excel-like usage; check for bugs in scrolling, selections.
- **Compatibility Tests**: Ensure no regressions in undo/redo, validation errors, etc.

**Duration**: 4-6 hours. Output: Test coverage >80% for new code; bug-free demo.

## Step 7: Deployment and Iteration
- **Merge and Deploy**: After PR review, merge to test-deploy branch (per git_status).
- **User Feedback**: Collect via USER_FEEDBACK_V1_0_20250704.md.
- **Phase 2 Ideas**: Advanced filters (OR logic, save presets), global search.

**Total Estimated Duration**: 20-35 hours (depending on complexity).
**Risks**: Potential scrolling glitches; mitigate with thorough testing.
**Next Steps**: Start with Step 1; prototype UI in a branch.

This plan ensures the filter feature integrates naturally, like in Google Sheets/Excel, while preserving the robustness of the existing system. 