ALTER TABLE vehicles
  ADD COLUMN city_id INT UNSIGNED NULL AFTER id;

UPDATE vehicles v
JOIN (
  SELECT ranked.vehicle_id, ranked.city_id
  FROM (
    SELECT
      city_usage.vehicle_id,
      city_usage.city_id,
      ROW_NUMBER() OVER (
        PARTITION BY city_usage.vehicle_id
        ORDER BY city_usage.trip_count DESC, city_usage.last_departure DESC, city_usage.city_id ASC
      ) AS city_rank
    FROM (
      SELECT
        s.vehicle_id,
        t.city_id,
        COUNT(*) AS trip_count,
        MAX(s.departure_datetime) AS last_departure
      FROM schedules s
      JOIN terminals t ON t.id = s.departure_terminal_id
      GROUP BY s.vehicle_id, t.city_id
    ) city_usage
  ) ranked
  WHERE ranked.city_rank = 1
) inferred_city ON inferred_city.vehicle_id = v.id
SET v.city_id = inferred_city.city_id
WHERE v.city_id IS NULL;

ALTER TABLE vehicles
  ADD INDEX idx_vehicle_city (city_id),
  ADD CONSTRAINT fk_vehicle_city FOREIGN KEY (city_id) REFERENCES cities(id);