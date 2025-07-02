# [V2] Easy-Epidemiology Project: AI Agent Development Guide

This is a complete, structured guide for an AI agent. Its purpose is to provide a deep understanding of the project's architecture, data flow, and development patterns, enabling complex and safe modifications.

---

## Level 1: The Core Principles

This application operates on three fundamental principles. Understanding them is key to understanding the entire codebase.

1.  **Single Source of Truth (SSoT)**: All data that is shared or persisted resides in the **Vuex store** (`src/components/store.js`). There is no other "database" or state container. Any data displayed in any tab originates from this single store.
2.  **Unidirectional Data Flow**: The data flow is strict and predictable.
    -   **State -> View**: The Vuex store's state drives what is shown on the screen.
    -   **View -> Actions**: User actions in the UI (like typing in a cell) do not directly change the data. Instead, they **dispatch Vuex actions**. These actions then mutate the state, which triggers the view to update.
3.  **Modular, Feature-Specific Views**: Each tab in the application is a self-contained Vue component responsible for a single feature (e.g., `CaseControl.vue` is only for case-control studies). This isolates concerns and makes the system easier to maintain.

---

## Level 2: The Grand Tour - Codebase Anatomy

This is the high-level map of the project's structure.

-   **`main.js`**: The application's entry point. It initializes Vue and the Vuex store.
-   **`App.vue`**: The **Conductor**. It holds the master layout, including the bottom tab bar. It uses a `<component :is="currentView">` to dynamically render the active tab's component. It does not contain business logic itself but orchestrates which view is visible.
-   **`src/components/store.js`**: The **Central Nervous System**. This is the Vuex store. It defines the data structure (`state`), the methods to change data (`mutations`), and the business logic for those changes (`actions`). **This is one of the most critical files.**
-   **`src/components/*.vue`**: The **Organs**. These are the individual feature views (the tabs).
    -   `DataInputRefactor/DataInputNew.vue`: The **Hands** of the application. This is the highly complex data grid for all user input. **It has its own in-depth guide: `AI_AGENT_DEVELOPMENT_GUIDE.md`.**
    -   `ClinicalSymptoms.vue`, `CaseControl.vue`, `CohortStudy.vue`, etc.: The **Brain** of the application. These components are responsible for analysis and visualization. They are primarily read-only consumers of the Vuex store data.

---

## Level 3: Deep Dive - The Data Lifecycle

This is the journey of data through the application.

1.  **Initialization**:
    -   When `App.vue` is created, it dispatches the `loadInitialData` action in the Vuex store.
    -   This action loads data (potentially from a mock source or API in the future) and commits it to the store, populating `state.headers` and `state.rows`.

2.  **Mutation**:
    -   A user types "Fever" into a cell in the `DataInput` grid.
    -   The `handleCellInput` event handler is triggered inside the `DataInputRefactor` component.
    -   This handler **dispatches** the `updateCell` action to the Vuex store with the new value.
    -   The `updateCell` action finds the correct row and column and **commits** the `UPDATE_CELL` mutation.
    -   The state in the Vuex store is now updated.

3.  **Reaction & Computation**:
    -   The `ClinicalSymptoms.vue` component is active.
    -   Inside it, a `computed` property called `symptomStats` is watching the `store.getters.rows`.
    -   Because the Vuex state changed, Vue's reactivity system automatically re-executes the `symptomStats` computation. It re-scans all rows and recalculates the frequency of each symptom.

4.  **Presentation**:
    -   The template of `ClinicalSymptoms.vue` is bound to the `symptomStats` computed property.
    -   The view updates automatically, showing the new count and percentage for "Fever" in its table.
    -   Simultaneously, another computed property for the `echarts` chart also re-runs, and the chart visually updates to reflect the new data.

---

## Level 4: Deep Dive - The Analysis Component Pattern

All analysis tabs (`ClinicalSymptoms`, `CaseControl`, etc.) follow a standardized and elegant pattern. To create a new analysis tab, you must follow it.

-   **Purpose**: To consume raw data from Vuex and present a specific, calculated analysis.

-   **Standard Implementation Pattern**:
    1.  **Get the Store**:
        ```javascript
        import { useStore } from 'vuex';
        const store = useStore();
        ```
    2.  **Create Reactive Pointers to State**: Use `computed` to create reactive references to the raw data from the store. This ensures your component will update when the data changes.
        ```javascript
        const rows = computed(() => store.getters.rows);
        const headers = computed(() => store.getters.headers);
        ```
    3.  **Perform Calculations in Computed Properties**: The core logic resides in a `computed` property that takes the raw data (`rows`, `headers`) as input and returns the calculated data for display. This is the "analysis engine" of your component.
        ```javascript
        const analysisResults = computed(() => {
          // ... extensive calculation logic using rows.value and headers.value ...
          return calculatedData;
        });
        ```
    4.  **Render the Results**: The component's `<template>` binds directly to the final computed property (`analysisResults`). It should contain no calculation logic itself.

-   **Example 1: `ClinicalSymptoms.vue`**
    -   **Focus**: Data transformation (filtering for patients, counting symptom occurrences) and visualization.
    -   **Technology**: Uses `echarts` for charting. The `chartOptions` are themselves a `computed` property that transforms the final `symptomStats` into a format `echarts` can understand.

-   **Example 2: `CaseControl.vue`**
    -   **Focus**: Complex statistical calculations.
    -   **Technology**: Uses the `jstat` library to calculate Chi-square, P-values, Odds Ratios, and 95% Confidence Intervals. The logic is entirely contained within the `analysisResults` computed property.

---

## Level 5: The Book of Law - Critical Development Rules

These rules are non-negotiable. They are based on previously solved, complex bugs. Ignoring them will break the application.

-   **Rule #1: Layout Integrity & `box-sizing`**
    -   **Context**: A component with `height: 100%` and `padding` will render *taller* than its parent by default.
    -   **The Law**: If an element has a percentage-based height (e.g., `height: 100%`) AND has `padding` or `border`, you **MUST** apply `box-sizing: border-box;`. This forces the padding/border *inside* the height calculation.

-   **Rule #2: Dynamic Table Sizing & `min-width`**
    -   **Context**: A table's width is dynamically calculated, but it refuses to shrink, causing misalignment with its header.
    -   **The Law**: For any table element whose `width` is being set dynamically by a Vue prop or style binding, you **MUST NOT** apply a `min-width` property (especially `min-width: 100%`). This allows the table to shrink correctly.

-   **Rule #3: State Immutability**
    -   **Context**: Data must be changed in a predictable, traceable way.
    -   **The Law**: **NEVER** modify data from the Vuex store directly (e.g., `store.state.rows.push(...)`). All changes **MUST** go through `store.dispatch("actionName", payload)`. This is essential for reactivity and the undo/redo functionality to work.

---

## Level 6: AI Agent Protocol

1.  **Identify the Locus of Change**:
    -   Is the change related to data entry/the grid? -> **Open `DataInputRefactor/AI_AGENT_DEVELOPMENT_GUIDE.md`**.
    -   Is the change related to a specific analysis or tab? -> **Go to that component file (e.g., `CaseControl.vue`)**.
    -   Is the change related to shared data or a core calculation? -> **Go to `store.js`**.
2.  **Follow the Data Flow**: Before writing code, trace the data lifecycle (Level 3). Where does the data come from? What action needs to be dispatched? How will the view react?
3.  **Obey the Book of Law**: For any layout or state change, re-read Level 5.
4.  **Use the Standard Patterns**: When adding new features, follow the existing patterns (e.g., The Analysis Component Pattern in Level 4). Do not introduce new, conflicting design patterns. 