const Itinerary = require('../models/resourceItineraryModel');

function getItinerary(type, req, res) {
  Itinerary.getItinerary(type, req.params.id, req.user, (err, result) => {
    if (err) return res.status(500).send({ error: err });
    if (!result) return res.status(404).send({ message: `${type} not found` });

    const now = Date.now();
    const conflictingIds = new Set();
    for (let firstIndex = 0; firstIndex < result.schedules.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < result.schedules.length; secondIndex += 1) {
        const first = result.schedules[firstIndex];
        const second = result.schedules[secondIndex];
        if (new Date(first.departure_datetime) < new Date(second.arrival_datetime)
          && new Date(second.departure_datetime) < new Date(first.arrival_datetime)) {
          conflictingIds.add(first.id);
          conflictingIds.add(second.id);
        }
      }
    }
    const schedules = result.schedules.map((schedule) => ({
      ...schedule,
      has_conflict: conflictingIds.has(schedule.id),
      is_current: new Date(schedule.departure_datetime).getTime() <= now
        && new Date(schedule.arrival_datetime).getTime() > now,
      is_completed: new Date(schedule.arrival_datetime).getTime() <= now
    }));
    const currentTrip = schedules.find((schedule) => schedule.is_current);
    const previousTrip = schedules
      .filter((schedule) => schedule.is_completed)
      .at(-1);
    const nextAssignment = schedules.find(
      (schedule) => new Date(schedule.departure_datetime).getTime() > now
    );

    const currentLocation = currentTrip
      ? {
          status: 'In transit',
          terminal_id: null,
          city_name: null,
          terminal_name: null,
          trip: currentTrip
        }
      : {
          status: 'At terminal',
          terminal_id: previousTrip?.arrival_terminal_id || result.resource.home_terminal_id,
          city_name: previousTrip?.arrival_city_name || result.resource.home_terminal_city_name || result.resource.city_name,
          terminal_name: previousTrip?.arrival_terminal_name || result.resource.home_terminal_name,
          trip: null
        };

    res.json({
      resource: result.resource,
      current_location: currentLocation,
      next_assignment: nextAssignment || null,
      itinerary: schedules
    });
  });
}

exports.getVehicleItinerary = (req, res) => getItinerary('vehicle', req, res);
exports.getDriverItinerary = (req, res) => getItinerary('driver', req, res);