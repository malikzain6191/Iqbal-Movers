UPDATE schedules s
JOIN routes r ON r.id = s.route_id
SET s.arrival_datetime = DATE_ADD(
  s.departure_datetime,
  INTERVAL r.estimated_duration_minutes MINUTE
)
WHERE s.status <> 'Cancelled'
  AND s.departure_datetime > CURRENT_TIMESTAMP
  AND r.estimated_duration_minutes > 0
  AND s.arrival_datetime <> DATE_ADD(
    s.departure_datetime,
    INTERVAL r.estimated_duration_minutes MINUTE
  );