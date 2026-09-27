import http from './client';

export function createBooking(scheduleId, passengers) {
  const idempotencyKey = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  return http.post('/bookings', { schedule_id: scheduleId, passengers }, {
    headers: { 'Idempotency-Key': idempotencyKey }
  });
}

export function listBookings() {
  return http.get('/bookings');
}

export function getManifest(scheduleId) {
  return http.get(`/schedules/${scheduleId}/manifest`);
}

export function cancelBooking(bookingId, reason) {
  return http.post(`/bookings/${bookingId}/cancel`, { reason });
}
