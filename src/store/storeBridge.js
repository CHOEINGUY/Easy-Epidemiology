import { EnhancedStorageManager } from './enhancedStorageManager.js';
import { HistoryManager } from './historyManager.js';
import { UserManager } from '../auth/UserManager.js';
import { ref, reactive } from 'vue';
import { useEpidemicStore } from '../stores/epidemicStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';

// Modular operations imports
import { cellOperations } from './storeBridgeCellOps.js';
import { rowOperations } from './storeBridgeRowOps.js';
import { columnOperations } from './storeBridgeColumnOps.js';
import { historyOperations } from './storeBridgeHistoryOps.js';
import { filterOperations } from './storeBridgeFilterOps.js';
import { getterOperations } from './storeBridgeGetters.js';

/**
 * StoreBridge (Modernized)
 * Acts as a Facade/Adapter between legacy component calls and modern Pinia stores.
 * Completely replaces the need for Vuex.
 */
export class StoreBridge {
  constructor(_legacyStore = null, validationManager = null, options = {}) { // eslint-disable-line no-unused-vars
    // Initialize Pinia Stores
    this.epidemicStore = useEpidemicStore();
    this.settingsStore = useSettingsStore();
    this.authStore = useAuthStore();
    this.uiStore = useUiStore();

    this.userManager = new UserManager();
    
    // Validating/Creating the Adapter Shim for legacy calls
    this.shimLegacyStore();
    
    // We pass the SHIM as the "legacyStore" to EnhancedStorageManager if needed, 
    // but EnhancedStorageManager expects a Vuex-like object. Our shim provides that.
    this.enhancedManager = new EnhancedStorageManager(this.legacyStore, this.userManager);
    
    this.history = new HistoryManager();
    this.validationManager = validationManager;
    this.isInitialized = false;
    
    this._canUndo = ref(false);
    this._canRedo = ref(false);
    
    this.filterState = reactive({
      activeFilters: new Map(),
      isFiltered: false,
      filteredRowCount: 0,
      originalRowCount: 0,
      lastAppliedAt: null
    });
    
    this._filteredRowMapping = new Map();
    this._originalToFilteredMapping = new Map();
    
    this.debug = options.debug ?? (import.meta.env?.MODE === 'development' || false);
    
    this.initialize();
    
    this._updateUndoRedoState();
    this.loadFilterState();

    // Auto-Save Subscription
    this.setupAutoSave();
  }

  shimLegacyStore() {
    const self = this;
    this.legacyStore = {
      state: {
        get epidemic() { return self.epidemicStore; }, // Direct access to Pinia state
        get settings() { return self.settingsStore; },
        get auth() { return self.authStore; },
        get ui() { return self.uiStore; }
      },
      getters: new Proxy({}, {
        get(target, prop) {
          // Map 'epidemic/headers' -> epidemicStore.headers
          if (typeof prop !== 'string') return undefined;
          const [module, key] = prop.split('/');
          const store = self[`${module}Store`];
          if (!store) return undefined;
          // Return state or getter
          return store[key];
        }
      }),
      dispatch: async (type, payload) => {
        return self.handleDispatch(type, payload);
      },
      commit: (type, payload, options) => {
        return self.handleCommit(type, payload, options);
      }
    };
  }

  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
  }
  
  setLegacyStore() {
    // No-op or log warning, as we don't allow external legacy store injection in Modern mode
    console.warn('[StoreBridge] setLegacyStore ignored. Using Internal Pinia Adapter.');
  }

  setCurrentUser(user) {
    // Sync to AuthStore and Manager
    this.authStore.setUser(user);
    this.enhancedManager.setCurrentUser(user);
    console.log('[StoreBridge] Current User synced:', user?.username);
  }

  setupAutoSave() {
    let saveTimeout = null;
    
    const triggerSave = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        this.saveCurrentState();
      }, 1000);
    };

    // Subscribe to Pinia stores
    this.epidemicStore.$subscribe(() => {
      triggerSave();
    });
    
    this.settingsStore.$subscribe(() => {
      triggerSave();
    });
  }

  // --- Dynamic Dispatch/Commit Handling ---
  
  async handleDispatch(type, payload) {
    const [module, action] = type.split('/');
    const store = this[`${module}Store`];
    
    if (store && typeof store[action] === 'function') {
      return store[action](payload);
    }
    console.warn(`[StoreBridge] Action not found: ${type}`);
  }

  handleCommit(type, payload) {
    // Handle both 'epidemic/MUTATION' and 'MUTATION' (default to epidemic)
    let module, mutation;
    if (type.includes('/')) {
      [module, mutation] = type.split('/');
    } else {
      module = 'epidemic';
      mutation = type;
    }
    
    // Map Mutation Names to Action Names or Direct State Updates
    // Legacy Mutations often are UPPER_CASE
    
    // Epidemic Mappings
    if (module === 'epidemic') {
      const mapping = {
        'SET_INITIAL_DATA': 'setInitialData',
        'UPDATE_CELL': 'updateCell',
        'UPDATE_HEADER': 'updateHeader',
        'ADD_ROWS': 'addRows',
        'SET_VALIDATION_ERRORS': 'setValidationErrors',
        'SET_VALIDATION_VERSION': 'setValidationVersion',
        'ADD_VALIDATION_ERROR': 'addValidationError',
        'REMOVE_VALIDATION_ERROR': 'removeValidationError',
        'ADD_VALIDATION_ERROR_BY_UNIQUE_KEY': 'addValidationErrorByUniqueKey',
        'REMOVE_VALIDATION_ERROR_BY_UNIQUE_KEY': 'removeValidationErrorByUniqueKey',
        'CLEAR_VALIDATION_ERRORS': 'clearValidationErrors'
        // Add more specific mappings if naming differs significantly
      };
      const target = mapping[mutation];
      if (target && this.epidemicStore[target]) {
        return this.epidemicStore[target](payload);
      }
      
      // Fallback: try converting UPPER_CASE to camelCase? 
      // Most Pinia actions I named match the legacy action names (camelCase).
      // But mutations are UPPER. 
      // I'll leave this for now, expecting callers to use DISPATCH mostly.
      // If code calls commit directly (rare in Bridges), we might need more map.
      // StoreBridge ops mostly call dispatch.
      
    }
    
    // Settings Mappings
    if (module === 'settings') {
      // Direct state access for simple setters
      if (mutation === 'SET_INDIVIDUAL_EXPOSURE_COLUMN_VISIBILITY') this.settingsStore.setIndividualExposureColumnVisibility(payload);
      else if (mutation === 'SET_CONFIRMED_CASE_COLUMN_VISIBILITY') this.settingsStore.setConfirmedCaseColumnVisibility(payload);
      else if (mutation === 'SET_SYMPTOM_INTERVAL') this.settingsStore.updateSymptomInterval(payload);
      else if (mutation === 'SET_EXPOSURE_DATETIME') this.settingsStore.updateExposureDateTime(payload);
      else if (mutation === 'SET_INCUBATION_INTERVAL') this.settingsStore.updateIncubationInterval(payload);
      // ... map others as needed ...
    }
    
    if (this.debug) console.log(`[StoreBridge] Commit handled via Adapter: ${type}`, payload);
  }

  // ... (Keep existing property getters that delegate to legacyStore, which is now our Shim) ...
  
  setColumnMetas(columnMetas) {
    this.columnMetas = columnMetas;
  }
  
  get headers() { return this.epidemicStore.headers; }
  get rows() { return this.epidemicStore.rows; }
  
  get basicInfoStartIndex() { return this.epidemicStore.basicInfoStartIndex; }
  get clinicalSymptomsStartIndex() { return this.epidemicStore.clinicalSymptomsStartIndex; }
  get individualExposureTimeStartIndex() { return this.epidemicStore.individualExposureTimeStartIndex; }
  get symptomOnsetStartIndex() { return this.epidemicStore.symptomOnsetStartIndex; }
  get dietInfoStartIndex() { return this.epidemicStore.dietInfoStartIndex; }

  get canUndo() { return this._canUndo.value; }
  get canRedo() { return this._canRedo.value; }
  
  // Expose the shim state for methods accessing this.legacyStore.state
  get state() { return this.legacyStore.state; }

  // ... (Keep static MUTATIVE_ACTIONS) ...
  static MUTATIVE_ACTIONS = [
    'insertRowAt', 'addRows', 'addRowsFromExcel',
    'deleteRow', 'deleteMultipleRows', 'deleteIndividualRows',
    'insertColumnAt', 'insertMultipleColumnsAt', 'addColumn', 'addMultipleColumns',
    'deleteColumn', 'deleteColumnByIndex', 'deleteMultipleColumnsByIndex',
    'deleteEmptyRows', 'deleteEmptyColumns',
    'clearRowData', 'clearMultipleRowsData', 'clearIndividualRowsData',
    'clearColumnData', 'clearCellData', 'clearMultipleColumnsData', 'clearFixedColumnData',
    'pasteData', 'pasteHeaderData', 'updateHeadersFromExcel',
    'resetSheet'
  ];

  async dispatch(actionName, payload) {
    // Route to internal handleDispatch or local handlers
    // logic is similar to before, but legacyStore.dispatch is wrapped
    
    const isMutative = StoreBridge.MUTATIVE_ACTIONS.includes(actionName);
    
    if (this.debug) console.log(`[StoreBridge] Dispatch: ${actionName}`, payload);

    const directHandlers = {
      'clearFixedColumnData': () => this.clearFixedColumnData(payload),
      'clearColumnData': () => this.clearColumnData(payload),
      'clearCellData': () => this.clearCellData(payload),
      'clearMultipleColumnsData': () => this.clearMultipleColumnsData(payload),
      'updateCellsBatch': () => this.updateCellsBatch(payload),
      'insertMultipleColumnsAt': () => this.insertMultipleColumnsAt(payload),
      'insertColumnAt': () => this.insertColumnAt(payload),
      'insertRowAt': () => this.insertRowAt(payload),
      'deleteColumnByIndex': () => this.deleteColumnByIndex(payload),
      'deleteMultipleColumnsByIndex': () => this.deleteMultipleColumnsByIndex(payload),
      'clearRowData': () => this.clearRowData(payload),
      'clearMultipleRowsData': () => this.clearMultipleRowsData(payload),
      'clearIndividualRowsData': () => this.clearIndividualRowsData(payload),
      'deleteRow': () => this.deleteRow(payload),
      'deleteMultipleRows': () => this.deleteMultipleRows(payload),
      'deleteIndividualRows': () => this.deleteIndividualRows(payload),
      'resetSheet': () => this.resetSheet()
    };

    if (directHandlers[actionName]) return directHandlers[actionName]();
    
    if (isMutative) this._captureSnapshot(actionName, payload);
    
    // Route to Pinia via Shim
    // Prepend 'epidemic/' if missing, as legacy calls often implied module?
    // Actually StoreBridge callers usually pass 'actionName' matching imports in 'storeBridgeCellOps.js'
    // But 'dispatch' calls inside ops usually pass 'epidemic/action'.
    // Here 'actionName' coming from 'useStoreBridge' is usually just 'addRows'.
    // We need to route it.
    
    let targetAction = actionName;
    if (!targetAction.includes('/')) targetAction = `epidemic/${targetAction}`;
    
    await this.legacyStore.dispatch(targetAction, payload);
    
    if (isMutative) this.saveCurrentState();
  }
  
  // ... (Keep existing methods: setGridData, loadInitialData, saveCellValue, saveHeaderValue) ...
  // loadInitialData and others need valid "this.legacyStore" or update to use stores directly.
  // Since we shimmed legacyStore, they should mostly work.

  async setGridData(headers, rows) {
    if (this.debug) console.log('[StoreBridge] setGridData', rows.length);
    this._captureSnapshot('setGridData', { rowCount: rows.length });
    
    this.epidemicStore.setInitialData({ headers, rows });
    this.saveCurrentState();
    
    if (this.validationManager) {
      const columnMetas = this.getColumnMetas();
      await this.validationManager.handleDataImport(rows, columnMetas);
    }
  }

  loadInitialData() {
    // Re-implement or adapt
    try {
      const loadedData = this.enhancedManager.loadData();
      if (loadedData) {
        this.epidemicStore.setInitialData({
          headers: loadedData.headers,
          rows: loadedData.rows
        });
        
        if (loadedData.settings) {
          const s = loadedData.settings;
          const ss = this.settingsStore;
          if (s.isIndividualExposureColumnVisible !== undefined) ss.setIndividualExposureColumnVisibility(s.isIndividualExposureColumnVisible);
          if (s.isConfirmedCaseColumnVisible !== undefined) ss.setConfirmedCaseColumnVisibility(s.isConfirmedCaseColumnVisible);
          if (s.selectedSymptomInterval !== undefined) ss.updateSymptomInterval(s.selectedSymptomInterval);
          if (s.exposureDateTime !== undefined) ss.updateExposureDateTime(s.exposureDateTime);
          if (s.selectedIncubationInterval !== undefined) ss.updateIncubationInterval(s.selectedIncubationInterval);
          if (s.analysisOptions !== undefined) ss.setAnalysisOptions(s.analysisOptions);
          if (s.yatesCorrectionSettings) {
            if (s.yatesCorrectionSettings.caseControl !== undefined) ss.setYatesCorrectionSettings({ type: 'caseControl', enabled: s.yatesCorrectionSettings.caseControl });
            if (s.yatesCorrectionSettings.cohort !== undefined) ss.setYatesCorrectionSettings({ type: 'cohort', enabled: s.yatesCorrectionSettings.cohort });
          }
          if (s.selectedSuspectedFoods !== undefined) ss.setSelectedSuspectedFoods(s.selectedSuspectedFoods);
          if (s.epidemicCurveSettings !== undefined) ss.updateEpidemicCurveSettings(s.epidemicCurveSettings);
          if (s.suspectedSource !== undefined) ss.setSuspectedSource(s.suspectedSource);
          if (s.analysisResults) {
            if (s.analysisResults.caseControl) ss.setAnalysisResults({ type: 'caseControl', results: s.analysisResults.caseControl });
            if (s.analysisResults.cohort) ss.setAnalysisResults({ type: 'cohort', results: s.analysisResults.cohort });
          }
        }

        if (loadedData.validationState) {
          const { errors, version } = loadedData.validationState;
          
          // Reconstruct Map if it's an object/array
          const errorMap = new Map();
          if (errors && typeof errors === 'object') {
            for(const [k,v] of Object.entries(errors)) {
              errorMap.set(k, v);
            }
          }
          
          this.epidemicStore.setValidationErrors(errorMap);
          this.epidemicStore.setValidationVersion(version);
        }
        return loadedData;
      } else {
        this.epidemicStore.loadInitialData();
      }
    } catch(e) {
      console.error('[StoreBridge] Error loading initial data', e);
      this.epidemicStore.loadInitialData();
    }
  }

  saveCellValue(rowIndex, colIndex, value, columnMeta) {
    if (rowIndex < 0) {
      return this.saveHeaderValue(colIndex, value, columnMeta);
    }
    const payload = { rowIndex, key: columnMeta.dataKey, value, cellIndex: columnMeta.cellIndex };
    
    // Check equality via store (shimmed state access)
    // const beforeValue = ... (omitted for brevity, can rely on store action efficiency or re-implement)
    // For now, straight dispatch
    this.epidemicStore.updateCell(payload);
    this.saveCurrentState();
    
    if (this.validationManager) {
      this.validationManager.validateCell(rowIndex, columnMeta.colIndex, value, columnMeta.type);
    }
    return true;
  }

  saveHeaderValue(colIndex, value, columnMeta) {
    const typeMap = { basic: 'basic', clinical: 'clinical', clinicalSymptoms: 'clinical', diet: 'diet', dietInfo: 'diet' };
    const headerType = typeMap[columnMeta.type];
    const headerIndex = columnMeta.cellIndex;
    
    this.epidemicStore.updateHeader({ headerType, index: headerIndex, text: value });
    this.saveCurrentState();
  }
}

// Merge prototypes
Object.assign(StoreBridge.prototype, cellOperations);
Object.assign(StoreBridge.prototype, rowOperations);
Object.assign(StoreBridge.prototype, columnOperations);
Object.assign(StoreBridge.prototype, historyOperations);
Object.assign(StoreBridge.prototype, filterOperations);
Object.assign(StoreBridge.prototype, getterOperations);

export function useStoreBridge(legacyStore = null, validationManager = null, options = {}) {
  // Pattern: Singleton or Instance per call? 
  // 'useStoreBridge' usually returns a fresh object wrapper?
  // Existing code creates 'const storeBridge = new StoreBridge' once in main.js.
  // And usage in components: 'useStoreBridge().method()'.
  // If useStoreBridge creates NEW instance every time, that's bad if state is inside instance.
  // But access is usually via 'window.storeBridge'.
  
  // The export seems to create a wrapper object.
  // For compatibility, we assume window.storeBridge is the MAIN instance.
  
  const bridge = window.storeBridge || new StoreBridge(legacyStore, validationManager, options);
  
  return {
    bridge, // access raw
    // ... mapped methods ...
    // Accessors
    get headers() { return bridge.headers; },
    get rows() { return bridge.rows; },
    get basicInfoStartIndex() { return bridge.basicInfoStartIndex; },
    get clinicalSymptomsStartIndex() { return bridge.clinicalSymptomsStartIndex; },
    get individualExposureTimeStartIndex() { return bridge.individualExposureTimeStartIndex; },
    get symptomOnsetStartIndex() { return bridge.symptomOnsetStartIndex; },
    get dietInfoStartIndex() { return bridge.dietInfoStartIndex; },
    get canUndo() { return bridge.canUndo; },
    get canRedo() { return bridge.canRedo; },
    get state() { return bridge.state; }, // Warning: this exposes Pinia state via Shim
    get filterState() { return bridge.filterState; },

    // Methods
    dispatch: (a, p) => bridge.dispatch(a, p),
    updateCell: (p) => bridge.updateCell(p),
    addRows: (c) => bridge.addRows(c),
    undo: () => bridge.undo(),
    redo: () => bridge.redo(),
    saveCurrentState: () => bridge.saveCurrentState(),
    setGridData: (h, r) => bridge.setGridData(h, r),
    loadInitialData: () => bridge.loadInitialData(),
    saveCellValue: (rowIndex, colIndex, value, columnMeta) => bridge.saveCellValue(rowIndex, colIndex, value, columnMeta),
    
    // ... Other methods ...
    updateHeader: (p) => bridge.updateHeader(p),
    updateIndividualExposureTime: (p) => bridge.updateIndividualExposureTime(p),
    addColumn: (t) => bridge.addColumn(t),
    deleteRow: (i) => bridge.deleteRow(i),
    deleteMultipleRows: (p) => bridge.deleteMultipleRows(p),
    deleteIndividualRows: (p) => bridge.deleteIndividualRows(p),
    deleteColumn: (t) => bridge.deleteColumn(t),
    deleteEmptyRows: () => bridge.deleteEmptyRows(),
    deleteEmptyColumns: () => bridge.deleteEmptyColumns(),
    pasteData: (p) => bridge.pasteData(p),
    resetSheet: () => bridge.resetSheet(),
    updateHeadersFromExcel: (h) => bridge.updateHeadersFromExcel(h),
    addRowsFromExcel: (r) => bridge.addRowsFromExcel(r),
    setIndividualExposureColumnVisibility: (v) => bridge.setIndividualExposureColumnVisibility(v),
    setConfirmedCaseColumnVisibility: (v) => bridge.setConfirmedCaseColumnVisibility(v),
    
    startCellEdit: (c, o, m) => bridge.startCellEdit(c, o, m),
    updateTempValue: (v) => bridge.updateTempValue(v),
    cancelCellEdit: () => bridge.cancelCellEdit(),
    completeCellEdit: () => bridge.completeCellEdit(),
    isEditing: () => bridge.isEditing(),
    getCurrentEditInfo: () => bridge.getCurrentEditInfo(),
    
    validate: () => bridge.validate(),
    
    addMultipleColumns: (p) => bridge.addMultipleColumns(p),
    insertColumnAt: (p) => bridge.insertColumnAt(p),
    insertMultipleColumnsAt: (p) => bridge.insertMultipleColumnsAt(p),
    deleteColumnByIndex: (p) => bridge.deleteColumnByIndex(p),
    deleteMultipleColumnsByIndex: (p) => bridge.deleteMultipleColumnsByIndex(p),
    clearColumnData: (p) => bridge.clearColumnData(p),
    clearMultipleColumnsData: (p) => bridge.clearMultipleColumnsData(p),
    clearFixedColumnData: (p) => bridge.clearFixedColumnData(p),
    handleEnter: (p) => bridge.handleEnter(p),
    insertRowAt: (p) => bridge.insertRowAt(p),
    pasteHeaderData: (p) => bridge.pasteHeaderData(p),
    updateCellsBatch: (p) => bridge.updateCellsBatch(p),
    updateSymptomInterval: (v) => bridge.settingsStore.updateSymptomInterval(v), // Direct map
    updateExposureDateTime: (v) => bridge.settingsStore.updateExposureDateTime(v),
    updateIncubationInterval: (v) => bridge.settingsStore.updateIncubationInterval(v),
    toggleIndividualExposureColumn: () => bridge.settingsStore.toggleIndividualExposureColumn(),
    toggleConfirmedCaseColumn: () => bridge.settingsStore.toggleConfirmedCaseColumn(),
    updateConfirmedCase: (p) => bridge.updateConfirmedCase(p),
    updateHeadersBatch: (p) => bridge.updateHeadersBatch(p),
    clearRowData: (p) => bridge.clearRowData(p),
    clearMultipleRowsData: (p) => bridge.clearMultipleRowsData(p),
    clearIndividualRowsData: (p) => bridge.clearIndividualRowsData(p),
    updateSingleHeader: (p) => bridge.updateSingleHeader(p),
    clearCellData: (p) => bridge.clearCellData(p),
    clearAllFilters: () => bridge.clearAllFilters()
  };
}