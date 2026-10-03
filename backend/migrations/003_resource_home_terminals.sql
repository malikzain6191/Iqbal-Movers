ALTER TABLE vehicles
  ADD COLUMN home_terminal_id INT UNSIGNED NULL AFTER city_id;

ALTER TABLE drivers
  ADD COLUMN home_terminal_id INT UNSIGNED NULL AFTER city_id;

UPDATE vehicles v
JOIN (
  SELECT ranked.vehicle_id, ranked.terminal_id
  FROM (
    SELECT
      s.vehicle_id,
      s.departure_terminal_id AS terminal_id,
      ROW_NUMBER() OVER (
        PARTITION BY s.vehicle_id
        ORDER BY s.departure_datetime ASC, s.id ASC
      ) AS schedule_rank
    FROM schedules s
    WHERE s.status <> 'Cancelled'
  ) ranked
  WHERE ranked.schedule_rank = 1
) first_departure ON first_departure.vehicle_id = v.id
SET v.home_terminal_id = first_departure.terminal_id
WHERE v.home_terminal_id IS NULL;

UPDATE drivers d
JOIN (
  SELECT ranked.driver_id, ranked.terminal_id
  FROM (
    SELECT
      s.driver_id,
      s.departure_terminal_id AS terminal_id,
      ROW_NUMBER() OVER (
        PARTITION BY s.driver_id
        ORDER BY s.departure_datetime ASC, s.id ASC
      ) AS schedule_rank
    FROM schedules s
    WHERE s.status <> 'Cancelled'
  ) ranked
  WHERE ranked.schedule_rank = 1
) first_departure ON first_departure.driver_id = d.id
SET d.home_terminal_id = first_departure.terminal_id
WHERE d.home_terminal_id IS NULL;

UPDATE vehicles v
JOIN terminals t ON t.city_id = v.city_id
SET v.home_terminal_id = t.id
WHERE v.home_terminal_id IS NULL
  AND t.id = (SELECT MIN(home.id) FROM terminals home WHERE home.city_id = v.city_id);

UPDATE drivers d
JOIN terminals t ON t.city_id = d.city_id
SET d.home_terminal_id = t.id
WHERE d.home_terminal_id IS NULL
  AND t.id = (SELECT MIN(home.id) FROM terminals home WHERE home.city_id = d.city_id);

ALTER TABLE vehicles
  ADD INDEX idx_vehicle_home_terminal (home_terminal_id),
  ADD CONSTRAINT fk_vehicle_home_terminal FOREIGN KEY (home_terminal_id) REFERENCES terminals(id);

ALTER TABLE drivers
  ADD INDEX idx_driver_home_terminal (home_terminal_id),
  ADD CONSTRAINT fk_driver_home_terminal FOREIGN KEY (home_terminal_id) REFERENCES terminals(id);