export type AffiliationType = 'hospital' | 'clinic' | 'public_health' | 'university' | 'research' | 'government' | 'other';

export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

const affiliationLabels: Record<AffiliationType, string> = {
  'hospital': '병원',
  'clinic': '의원',
  'public_health': '보건소',
  'university': '대학교',
  'research': '연구기관',
  'government': '정부기관',
  'other': '기타'
};

export const getAffiliationTypeLabel = (type: AffiliationType | string | null | undefined): string => {
  return affiliationLabels[type as AffiliationType] || type || '-';
};

export const getAffiliationTypeClass = (type: AffiliationType | string | null | undefined): string => {
  return `affiliation-${type || 'other'}`;
};

const statusClasses: Record<UserStatus, string> = {
  'pending': 'pending',
  'approved': 'approved',
  'rejected': 'rejected',
  'suspended': 'suspended'
};

export const getStatusClass = (status: UserStatus | string | null | undefined): string => {
  return statusClasses[status as UserStatus] || 'pending';
};

const statusLabels: Record<UserStatus, string> = {
  'pending': '승인 대기',
  'approved': '승인됨',
  'rejected': '거부됨',
  'suspended': '정지됨'
};

export const getStatusLabel = (status: UserStatus | string | null | undefined): string => {
  return statusLabels[status as UserStatus] || '승인 대기';
};

const statusIcons: Record<UserStatus, string> = {
  'pending': 'hourglass_empty',
  'approved': 'check_circle',
  'rejected': 'cancel',
  'suspended': 'block'
};

export const getStatusIcon = (status: UserStatus | string | null | undefined): string => {
  return statusIcons[status as UserStatus] || 'hourglass_empty';
};

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR');
};
