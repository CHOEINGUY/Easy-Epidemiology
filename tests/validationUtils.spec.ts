import {
  getColumnUniqueKey,
  getErrorKey,
  getValidationMessage,
  hasValidationError,
  parseErrorKey,
  type ValidationErrorMap
} from '@/components/DataInputVirtualScroll/utils/validationUtils';
import type { GridHeader } from '@/types/grid';

const makeHeader = (overrides: Partial<GridHeader> = {}): GridHeader => ({
  text: '기본 열',
  value: 'basic',
  type: 'basic',
  dataKey: '0-1',
  ...overrides
});

describe('validationUtils', () => {
  describe('getColumnUniqueKey', () => {
    it('returns null when metadata is missing', () => {
      expect(getColumnUniqueKey(null)).toBeNull();
    });

    it('builds stable keys for special columns', () => {
      expect(getColumnUniqueKey(makeHeader({ type: 'patientId' }))).toBe('patient_id');
      expect(getColumnUniqueKey(makeHeader({ type: 'patientName' }))).toBe('patient_name');
      expect(getColumnUniqueKey(makeHeader({ type: 'isConfirmedCase' }))).toBe('confirmed_case');
    });

    it('includes exposure cell index for individual exposure time columns', () => {
      expect(getColumnUniqueKey(makeHeader({
        type: 'individualExposureTime',
        dataKey: 'exposure',
        cellIndex: 3
      }))).toBe('exposure_exposure_3');
    });

    it('includes optional cell and group metadata in generic keys', () => {
      expect(getColumnUniqueKey(makeHeader({
        type: 'diet',
        dataKey: 'meal',
        cellIndex: 2,
        group: 'lunch'
      }))).toBe('meal__diet__2__lunch');
    });

    it('keeps generic keys stable when optional metadata is absent', () => {
      expect(getColumnUniqueKey(makeHeader({
        type: 'clinical',
        dataKey: 'fever',
        cellIndex: undefined,
        group: undefined
      }))).toBe('fever__clinical');
    });
  });

  describe('error key helpers', () => {
    it('round-trips a valid error key', () => {
      const key = getErrorKey(12, 'meal__diet__2');
      expect(key).toBe('12_meal__diet__2');
      expect(parseErrorKey(key)).toEqual({ rowIndex: 12, uniqueKey: 'meal__diet__2' });
    });

    it('rejects malformed error keys', () => {
      expect(parseErrorKey('invalid')).toBeNull();
      expect(parseErrorKey('_missingRow')).toBeNull();
      expect(parseErrorKey('abc_patient_id')).toBeNull();
      expect(parseErrorKey('-1_patient_id')).toBeNull();
    });
  });

  describe('validation error lookup', () => {
    const header = makeHeader({ type: 'patientId' });

    it('finds a validation error and returns its message', () => {
      const errors: ValidationErrorMap = new Map([
        ['3_patient_id', { message: '환자 ID를 확인해주세요.' }]
      ]);

      expect(hasValidationError(3, 0, header, errors)).toBe(true);
      expect(getValidationMessage(3, 0, header, errors)).toBe('환자 ID를 확인해주세요.');
    });

    it('uses a safe fallback message and returns empty string when no error exists', () => {
      const errors: ValidationErrorMap = new Map([
        ['3_patient_id', {}]
      ]);

      expect(getValidationMessage(3, 0, header, errors)).toBe('유효성 검사 오류');
      expect(hasValidationError(4, 0, header, errors)).toBe(false);
      expect(getValidationMessage(4, 0, header, errors)).toBe('');
    });

    it('safely handles missing metadata or error maps', () => {
      const emptyErrors: ValidationErrorMap = new Map();

      expect(hasValidationError(0, 0, null, emptyErrors)).toBe(false);
      expect(hasValidationError(0, 0, header, null)).toBe(false);
      expect(getValidationMessage(0, 0, null, emptyErrors)).toBe('');
      expect(getValidationMessage(0, 0, header, null)).toBe('');
    });
  });
});
