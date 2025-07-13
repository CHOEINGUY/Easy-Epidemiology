import {
  handleRegister,
  handleLogin,
  handleVerifyToken,
  handleCheckUsername,
  handleCORS as handleAuthCORS
} from './auth.js';

import {
  handleGetPendingUsers,
  handleApproveUser,
  handleRejectUser,
  handleBulkApproveUsers,
  handleBulkRejectUsers,
  handleGetAllUsers,
  handleDeleteUser,
  handleCORS as handleAdminCORS,
  handleUpdateUserRole,
  handleUpdateUserInfo
} from './admin.js';

import { errorResponse } from './utils.js';

export default {
  async fetch(request, env, ctx) {
    // CORS preflight 요청 처리
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 인증 관련 API
      if (path === '/api/auth/register') {
        return await handleRegister(request, env);
      }

      if (path === '/api/auth/login') {
        return await handleLogin(request, env);
      }

      if (path === '/api/auth/verify') {
        return await handleVerifyToken(request, env);
      }

      if (path === '/api/auth/check-username') {
        return await handleCheckUsername(request, env);
      }

      // 관리자 관련 API
      if (path === '/api/admin/pending-users') {
        return await handleGetPendingUsers(request, env);
      }

      if (path === '/api/admin/approve') {
        return await handleApproveUser(request, env);
      }

      if (path === '/api/admin/reject') {
        return await handleRejectUser(request, env);
      }

      if (path === '/api/admin/bulk-approve') {
        return await handleBulkApproveUsers(request, env);
      }

      if (path === '/api/admin/bulk-reject') {
        return await handleBulkRejectUsers(request, env);
      }

      if (path === '/api/admin/users') {
        return await handleGetAllUsers(request, env);
      }

      if (path === '/api/admin/delete-user') {
        return await handleDeleteUser(request, env);
      }

      if (path === '/api/admin/update-role') {
        return await handleUpdateUserRole(request, env);
      }

      if (path === '/api/admin/update-user-info') {
        return await handleUpdateUserInfo(request, env);
      }

      // 헬스체크 엔드포인트
      if (path === '/api/health') {
        return new Response(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          environment: 'production'
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // 404 처리
      return errorResponse('API endpoint not found', 404);

    } catch (error) {
      console.error('Worker error:', error);
      return errorResponse('Internal server error', 500);
    }
  }
}; 