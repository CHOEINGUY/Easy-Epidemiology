export const getAffiliationTypeLabel = (type) => {
  const labels = {
    'hospital': '병원',
    'clinic': '의원', 
    'public_health': '보건소',
    'university': '대학교',
    'research': '연구기관',
    'government': '정부기관',
    'other': '기타'
  };
  return labels[type] || type || '-';
};

export const getAffiliationTypeClass = (type) => {
  return `affiliation-${type || 'other'}`;
};

export const getStatusClass = (status) => {
  return {
    'pending': 'pending',
    'approved': 'approved', 
    'rejected': 'rejected',
    'suspended': 'suspended'
  }[status] || 'pending';
};

export const getStatusLabel = (status) => {
  return {
    'pending': '승인 대기',
    'approved': '승인됨',
    'rejected': '거부됨', 
    'suspended': '정지됨'
  }[status] || '승인 대기';
};

export const getStatusIcon = (status) => {
  return {
    'pending': 'hourglass_empty',
    'approved': 'check_circle',
    'rejected': 'cancel',
    'suspended': 'block'
  }[status] || 'hourglass_empty';
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR');
};
