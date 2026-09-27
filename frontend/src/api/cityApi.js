import http from './client';

export function listCities() {
  return http.get('/cities');
}

export function getCity(cityId) {
  return http.get(`/cities/${cityId}`);
}

export function createCity(name) {
  return http.post('/cities', { name });
}

export function updateCity(cityId, payload) {
  return http.patch(`/cities/${cityId}`, payload);
}

export function deleteCity(cityId) {
  return http.delete(`/cities/${cityId}`);
}

export function listTerminals(cityId) {
  const query = cityId ? `?${new URLSearchParams({ city_id: cityId })}` : '';
  return http.get(`/terminals${query}`);
}

export function getTerminal(terminalId) {
  return http.get(`/terminals/${terminalId}`);
}

export function createTerminal(payload) {
  return http.post('/terminals', payload);
}

export function updateTerminal(terminalId, payload) {
  return http.patch(`/terminals/${terminalId}`, payload);
}

export function deleteTerminal(terminalId) {
  return http.delete(`/terminals/${terminalId}`);
}
