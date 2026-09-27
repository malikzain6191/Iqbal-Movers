const Driver = require('../models/driverModel');
const { logAudit } = require('../utils/audit');
const { isCnic, isFutureDate, isLicenseNumber, isPersonName, isPhone, isPositiveId, normalizeText } = require('../utils/validation');

exports.getAllDrivers = (req, res) => {
  const cityFilter = req.user.role === 'super_admin' ? null : req.user.city_id;
  Driver.getalldrivers(cityFilter, (err, results) => {
    if (err) return res.status(500).send({ error: err });
    res.json(results);
  });
};

exports.createDriver = (req, res) => {
  const cityId = req.user.role === 'super_admin' ? req.body.city_id : req.user.city_id;
  const name = normalizeText(req.body.name);
  const cnicDigits = String(req.body.cnic || '').replace(/\D/g, '');
  const licenseNumber = String(req.body.license_number || '').trim();
  const phone = String(req.body.phone || '').trim();
  const expiry = String(req.body.license_expiry_date || '');
  if (!isPersonName(name)) return res.status(400).send({ message: 'Driver name must contain letters, spaces, apostrophes, or hyphens only' });
  if (!isCnic(cnicDigits)) return res.status(400).send({ message: 'CNIC must contain exactly 13 digits' });
  if (!isLicenseNumber(licenseNumber)) return res.status(400).send({ message: 'Enter a valid license number' });
  if (!isFutureDate(expiry)) return res.status(400).send({ message: 'License expiry must be a valid future date' });
  if (!isPhone(phone)) return res.status(400).send({ message: 'Enter a valid driver phone number' });
  if (!isPositiveId(cityId)) return res.status(400).send({ message: 'A valid city_id is required' });

  const cnic = `${cnicDigits.slice(0, 5)}-${cnicDigits.slice(5, 12)}-${cnicDigits.slice(12)}`;

  Driver.createdriver({ ...req.body, name, cnic, phone: phone || null, license_number: licenseNumber, license_expiry_date: expiry, city_id: cityId }, (err, result) => {
    if (err) return res.status(500).send({ error: err });
    if (!result.success && result.reason === 'DUPLICATE') {
      return res.status(400).send({ message: 'A driver with this CNIC or license number already exists' });
    }
    logAudit(req.user.id, req.user.name, 'Driver Creation', 'Driver', result.insertedId, req.body.name);
    res.status(201).send({ message: 'Driver created successfully', driverId: result.insertedId });
  });
};

exports.toggleDriverStatus = (req, res) => {
  Driver.toggledriverstatus(req.params.id, (err, result) => {
    if (err) return res.status(500).send({ error: err });
    if (!result.success) return res.status(404).send({ message: 'Driver not found' });
    logAudit(req.user.id, req.user.name, 'Driver Modification', 'Driver', req.params.id, `→ ${result.newStatus}`);
    res.send({ message: 'Driver status updated', status: result.newStatus });
  });
};
