const db = require('../config/db');
const { driverScope, vehicleScope } = require('../utils/accessScope');

const RESOURCE_TYPES = {
  vehicle: { table: 'vehicles', scope: vehicleScope },
  driver: { table: 'drivers', scope: driverScope }
};

exports.getItinerary = (type, id, user, cb) => {
  const resourceType = RESOURCE_TYPES[type];
  if (!resourceType) return cb(new Error('Unsupported resource type'));

  const scope = resourceType.scope(user, 'resource');
  db.query(
    `SELECT resource.*, city.name AS city_name,
                 home.name AS home_terminal_name, home.city_id AS home_terminal_city_id,
                 home_city.name AS home_terminal_city_name
     FROM ${resourceType.table} resource
     LEFT JOIN cities city ON city.id = resource.city_id
     LEFT JOIN terminals home ON home.id = resource.home_terminal_id
               LEFT JOIN cities home_city ON home_city.id = home.city_id
     WHERE resource.id = ? AND ${scope.sql}`,
    [id, ...scope.params],
    (resourceError, resources) => {
      if (resourceError) return cb(resourceError);
      if (!resources.length) return cb(null, null);

      const scheduleColumn = type === 'vehicle' ? 'vehicle_id' : 'driver_id';
      db.query(
        `SELECT s.id, s.schedule_number, s.departure_datetime,
          CASE WHEN r.estimated_duration_minutes > 0
            THEN DATE_ADD(s.departure_datetime, INTERVAL r.estimated_duration_minutes MINUTE)
            ELSE s.arrival_datetime
          END AS arrival_datetime,
                s.status, s.fare, r.name AS route_name, r.distance_km,
                r.estimated_duration_minutes,
                v.vehicle_number, v.bus_name, v.registration_number,
                driver.name AS driver_name,
                origin.id AS departure_terminal_id,
                origin.name AS departure_terminal_name,
                origin_city.name AS departure_city_name,
                destination.id AS arrival_terminal_id,
                destination.name AS arrival_terminal_name,
                destination_city.name AS arrival_city_name
         FROM schedules s
         JOIN routes r ON r.id = s.route_id
         JOIN vehicles v ON v.id = s.vehicle_id
         JOIN drivers driver ON driver.id = s.driver_id
         JOIN terminals origin ON origin.id = s.departure_terminal_id
         JOIN cities origin_city ON origin_city.id = origin.city_id
         JOIN terminals destination ON destination.id = s.arrival_terminal_id
         JOIN cities destination_city ON destination_city.id = destination.city_id
         WHERE s.${scheduleColumn} = ? AND s.status <> 'Cancelled'
         ORDER BY s.departure_datetime ASC, s.id ASC`,
        [id],
        (scheduleError, schedules) => {
          if (scheduleError) return cb(scheduleError);
          cb(null, { resource: resources[0], schedules });
        }
      );
    }
  );
};