import http from './client';

export function listUsers() {
  return http.get('/users');
}

export function createUser(payload) {
  return http.post('/users', payload);
}

export function toggleUserStatus(userId) {
  return http.patch(`/users/${userId}/status`, {});
}
