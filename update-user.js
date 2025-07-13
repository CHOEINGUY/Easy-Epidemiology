const API_BASE = 'https://epidemiology-auth-worker.chldlsrb07.workers.dev';

// 관리자 토큰 (실제 토큰으로 교체 필요)
const ADMIN_TOKEN = 'your-admin-token-here';

async function updateUserInfo() {
  try {
    // 먼저 모든 사용자 목록을 가져와서 chldlsrb07의 userId를 찾습니다
    const usersResponse = await fetch(`${API_BASE}/api/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!usersResponse.ok) {
      throw new Error('사용자 목록 조회 실패');
    }

    const usersData = await usersResponse.json();
    const chldlsrb07User = usersData.data.users.find(user => user.username === 'chldlsrb07');

    if (!chldlsrb07User) {
      throw new Error('chldlsrb07 사용자를 찾을 수 없습니다');
    }

    console.log('찾은 사용자:', chldlsrb07User);

    // 사용자 정보 업데이트
    const updateData = {
      userId: chldlsrb07User.id,
      organization: '기타',
      organizationType: '기타',
      phone: '010-3323-7008',
      createdAt: new Date().toISOString() // 오늘 날짜
    };

    const updateResponse = await fetch(`${API_BASE}/api/admin/update-user-info`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(errorData.message || '사용자 정보 업데이트 실패');
    }

    const result = await updateResponse.json();
    console.log('업데이트 성공:', result);

  } catch (error) {
    console.error('오류:', error.message);
  }
}

// 스크립트 실행
updateUserInfo(); 