const Vehicle = require('../models/vehicleModel');
const { logAudit } = require('../utils/audit');
const { isBusName, isRegistrationNumber, isVehicleNumber, normalizeText } = require('../utils/validation');

const VALID_STATUSES = ['Active', 'Under Maintenance', 'Inactive'];

exports.getAllVehicle = (req, res) => {
  Vehicle.getallvehicle((err, results) => {
    if (err) return res.status(500).send({ error: err });
    res.json(results);
  });
};

exports.getVehicleByID = (req, res) => {
  Vehicle.getvehiclebyID(req.params.id, (err, results) => {
    if (err) return res.status(500).send({ error: err });
    if (results.length === 0) return res.status(404).send({ message: 'Vehicle not found' });
    res.json(results[0]);
  });
};

exports.createVehicle = (req, res) => {
  const vehicleNumber = String(req.body.vehicle_number || '').trim().toUpperCase();
  const registrationNumber = String(req.body.registration_number || '').trim().toUpperCase();
  const busName = normalizeText(req.body.bus_name);
  const vehicleType = normalizeText(req.body.vehicle_type);
  const capacity = Number(req.body.seating_capacity);
  if (!isVehicleNumber(vehicleNumber)) return res.status(400).send({ message: 'Vehicle number may contain letters, numbers, and hyphens only' });
  if (!isRegistrationNumber(registrationNumber)) return res.status(400).send({ message: 'Enter a valid registration number' });
  if (!isBusName(busName)) return res.status(400).send({ message: 'Bus name contains invalid characters' });
  if (!vehicleType || vehicleType.length > 40) return res.status(400).send({ message: 'A valid vehicle type is required' });
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) return res.status(400).send({ message: 'Seating capacity must be a whole number from 1 to 100' });

  Vehicle.createvehicle({ ...req.body, vehicle_number: vehicleNumber, registration_number: registrationNumber, bus_name: busName || vehicleNumber, vehicle_type: vehicleType, seating_capacity: capacity }, (err, result) => {
    if (err) return res.status(500).send({ error: err });
    if (!result.success && result.reason === 'DUPLICATE') {
      return res.status(400).send({ message: 'A vehicle with this number or registration already exists' });
    }
    logAudit(req.user.id, req.user.name, 'Vehicle Creation', 'Vehicle', result.insertedId, req.body.vehicle_number);
    res.status(201).send({ message: 'Vehicle created successfully', vehicleId: result.insertedId });
  });
};

exports.changeVehicleStatus = (req, res) => {
  const { new_status, reason } = req.body;
  if (!VALID_STATUSES.includes(new_status)) {
    return res.status(400).send({ message: `new_status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  Vehicle.updatevehiclestatus(req.params.id, new_status, reason, req.user.id, (err, result) => {
    if (err) return res.status(500).send({ error: err });
    if (!result.success) return res.status(404).send({ message: 'Vehicle not found' });
    logAudit(req.user.id, req.user.name, 'Vehicle Update', 'Vehicle', req.params.id, `${result.oldStatus} → ${result.newStatus}`);
    res.send({ message: 'Vehicle status updated', status: result.newStatus });
  });
};
