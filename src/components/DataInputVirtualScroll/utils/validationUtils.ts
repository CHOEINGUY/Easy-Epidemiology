/**
 * 고유 식별자 및 유효성 오류 조회 유틸리티
 */
import type { GridHeader } from '@/types/grid';

export interface ValidationErrorLike {
  message?: string;
}

export type ValidationErrorMap = Map<string, ValidationErrorLike>;

/**
 * 열 메타데이터로부터 고유 식별자 생성
 */
export function getColumnUniqueKey(columnMeta: GridHeader | null): string | null {
  if (!columnMeta) return null;

  const dataKey = columnMeta.dataKey ?? '';
  const type = columnMeta.type ?? '';
  const cellIndex = columnMeta.cellIndex;
  const group = columnMeta.group ?? '';

  if (type === 'individualExposureTime') {
    return `exposure_${dataKey}_${cellIndex ?? ''}`;
  }
  if (type === 'isConfirmedCase') return 'confirmed_case';
  if (type === 'patientId') return 'patient_id';
  if (type === 'patientName') return 'patient_name';

  const parts: Array<string | number> = [dataKey, type];
  if (cellIndex !== null && cellIndex !== undefined) parts.push(cellIndex);
  if (group) parts.push(group);

  return parts.filter(value => value !== '').join('__');
}

/**
 * 행과 열 정보로부터 에러 키 생성
 */
export function getErrorKey(rowIndex: number, uniqueKey: string): string {
  return `${rowIndex}_${uniqueKey}`;
}

/**
 * 에러 키에서 행 인덱스와 고유 식별자 분리
 */
export function parseErrorKey(errorKey: string): { rowIndex: number; uniqueKey: string } | null {
  const separatorIndex = errorKey.indexOf('_');
  if (separatorIndex <= 0 || separatorIndex === errorKey.length - 1) return null;

  const rowIndexText = errorKey.slice(0, separatorIndex);
  const uniqueKey = errorKey.slice(separatorIndex + 1);
  const rowIndex = Number(rowIndexText);

  if (!Number.isInteger(rowIndex) || rowIndex < 0 || !uniqueKey) return null;
  return { rowIndex, uniqueKey };
}

/**
 * 고유 식별자 기반으로 에러 여부 확인
 */
export function hasValidationError(
  rowIndex: number,
  _colIndex: number,
  columnMeta: GridHeader | null,
  validationErrors: ValidationErrorMap | null
): boolean {
  if (!validationErrors || !columnMeta) return false;

  const uniqueKey = getColumnUniqueKey(columnMeta);
  if (!uniqueKey) return false;

  return validationErrors.has(getErrorKey(rowIndex, uniqueKey));
}

/**
 * 고유 식별자 기반으로 에러 메시지 조회
 */
export function getValidationMessage(
  rowIndex: number,
  _colIndex: number,
  columnMeta: GridHeader | null,
  validationErrors: ValidationErrorMap | null
): string {
  if (!validationErrors || !columnMeta) return '';

  const uniqueKey = getColumnUniqueKey(columnMeta);
  if (!uniqueKey) return '';

  const error = validationErrors.get(getErrorKey(rowIndex, uniqueKey));
  return error?.message || (error ? '유효성 검사 오류' : '');
}
