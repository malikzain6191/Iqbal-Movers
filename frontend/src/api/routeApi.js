import http from './client';

export function listRoutes() {
  return http.get('/routes');
}

export function createRoute(payload) {
  return http.post('/routes', payload);
}
