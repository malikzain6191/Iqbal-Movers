import http from './client';

export function listVehicles() {
  return http.get('/vehicles');
}

export function getVehicle(vehicleId) {
  return http.get(`/vehicles/${vehicleId}`);
}

export function getVehicleItinerary(vehicleId) {
  return http.get(`/vehicles/${vehicleId}/itinerary`);
}

export function createVehicle(payload) {
  return http.post('/vehicles', payload);
}

export function changeVehicleStatus(vehicleId, newStatus, reason) {
  return http.post(`/vehicles/${vehicleId}/status`, { new_status: newStatus, reason });
}
