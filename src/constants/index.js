export const AFFILIATION_TYPES = {
  HOSPITAL: 'hospital',
  CLINIC: 'clinic',
  PUBLIC_HEALTH: 'public_health',
  UNIVERSITY: 'university',
  RESEARCH: 'research',
  GOVERNMENT: 'government',
  OTHER: 'other'
};

export const AFFILIATION_LABELS = {
  [AFFILIATION_TYPES.HOSPITAL]: '병원',
  [AFFILIATION_TYPES.CLINIC]: '의원',
  [AFFILIATION_TYPES.PUBLIC_HEALTH]: '보건소',
  [AFFILIATION_TYPES.UNIVERSITY]: '대학',
  [AFFILIATION_TYPES.RESEARCH]: '연구소',
  [AFFILIATION_TYPES.GOVERNMENT]: '지자체/공무원',
  [AFFILIATION_TYPES.OTHER]: '기타'
};

export const USER_ROLES = {
  ADMIN: 'admin',
  SUPPORT: 'support',
  USER: 'user'
};

export const USER_ROLE_LABELS = {
  [USER_ROLES.ADMIN]: '시스템 관리자',
  [USER_ROLES.SUPPORT]: '지원단',
  [USER_ROLES.USER]: '일반 사용자'
};

export const USER_STATUS = {
  APPROVED: 'approved',
  PENDING: 'pending',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended'
};

export const USER_STATUS_LABELS = {
  [USER_STATUS.APPROVED]: '승인됨',
  [USER_STATUS.PENDING]: '승인 대기',
  [USER_STATUS.REJECTED]: '거부됨',
  [USER_STATUS.SUSPENDED]: '정지됨'
};
