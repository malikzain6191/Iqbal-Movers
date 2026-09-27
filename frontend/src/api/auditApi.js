import http from './client';

export function listAuditLogs() {
  return http.get('/audit-logs');
}
