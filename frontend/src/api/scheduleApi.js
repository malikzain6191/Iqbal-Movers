import http from './client';

export function listSchedules() {
  return http.get('/schedules');
}

export function getAvailability(depDT, arrDT, excludeScheduleId) {
  const query = new URLSearchParams({ departure_datetime: depDT, arrival_datetime: arrDT });
  if (excludeScheduleId) query.set('exclude_schedule_id', excludeScheduleId);
  return http.get(`/schedules/availability?${query}`);
}

export function getScheduleSeats(scheduleId) {
  return http.get(`/schedules/${scheduleId}/seats`);
}

export function createSchedule(payload) {
  return http.post('/schedules', payload);
}

export function cancelSchedule(scheduleId) {
  return http.post(`/schedules/${scheduleId}/cancel`, {});
}

export function replaceVehicle(scheduleId, newVehicleId, reason) {
  return http.post(`/schedules/${scheduleId}/replace-vehicle`, {
    new_vehicle_id: newVehicleId,
    reason
  });
}
