import http from './client';

export function listDrivers() {
  return http.get('/drivers');
}

export function createDriver(payload) {
  return http.post('/drivers', payload);
}

export function toggleDriverStatus(driverId) {
  return http.post(`/drivers/${driverId}/suspend`, {});
}
