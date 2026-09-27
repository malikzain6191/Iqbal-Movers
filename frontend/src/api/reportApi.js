import http from './client';

export function getTodayDashboard() {
  return http.get('/reports/dashboard/today');
}

export function getDailySales() {
  return http.get('/reports/daily-sales');
}

export function getRouteRevenue() {
  return http.get('/reports/route-revenue');
}

export function getVehicleUtilization() {
  return http.get('/reports/vehicle-utilization');
}

export function getDriverPerformance() {
  return http.get('/reports/driver-performance');
}

export function getCashCollection() {
  return http.get('/reports/cash-collection');
}
