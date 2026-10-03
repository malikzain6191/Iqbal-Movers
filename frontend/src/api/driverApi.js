import http from './client';

export function listDrivers() {
  return http.get('/drivers');
}

export function getDriverItinerary(driverId) {
  return http.get(`/drivers/${driverId}/itinerary`);
}

export function createDriver(payload) {
  return http.post('/drivers', payload);
}

export function toggleDriverStatus(driverId) {
  return http.post(`/drivers/${driverId}/suspend`, {});
}
