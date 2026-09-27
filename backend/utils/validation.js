const CITY_NAME = /^[A-Za-z]+(?: +[A-Za-z]+)*$/;
const PERSON_NAME = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
const TERMINAL_NAME = /^[A-Za-z0-9]+(?:[ '-][A-Za-z0-9]+)*$/;
const PHONE = /^\+?[0-9][0-9 ()-]{6,19}$/;
const USERNAME = /^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$/;
const LICENSE_NUMBER = /^[A-Za-z0-9][A-Za-z0-9/-]{2,29}$/;
const VEHICLE_NUMBER = /^[A-Za-z0-9][A-Za-z0-9-]{0,19}$/;
const REGISTRATION_NUMBER = /^[A-Za-z0-9][A-Za-z0-9 -]{2,19}$/;

exports.normalizeText = (value) => String(value || '').trim().replace(/\s+/g, ' ');
exports.isCityName = (value) => CITY_NAME.test(value);
exports.isPersonName = (value) => PERSON_NAME.test(value);
exports.isTerminalName = (value) => TERMINAL_NAME.test(value);
exports.isPhone = (value) => {
  if (!value) return true;
  const digits = String(value).replace(/\D/g, '');
  return PHONE.test(value) && digits.length >= 7 && digits.length <= 15;
};
exports.isUsername = (value) => USERNAME.test(value);
exports.isPassword = (value) => typeof value === 'string' && value.length >= 8 && value.length <= 72 && /[A-Za-z]/.test(value) && /[0-9]/.test(value);
exports.isCnic = (value) => /^(?:[0-9]{13}|[0-9]{5}-[0-9]{7}-[0-9])$/.test(value);
exports.isLicenseNumber = (value) => LICENSE_NUMBER.test(value);
exports.isVehicleNumber = (value) => VEHICLE_NUMBER.test(value);
exports.isRegistrationNumber = (value) => REGISTRATION_NUMBER.test(value);
exports.isBusName = (value) => !value || TERMINAL_NAME.test(value);
exports.isPositiveId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;
exports.isOptionalPositiveNumber = (value) => value == null || value === '' || (Number.isFinite(Number(value)) && Number(value) > 0);
exports.isOptionalPositiveInteger = (value) => value == null || value === '' || (Number.isInteger(Number(value)) && Number(value) > 0);

exports.isValidDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

exports.isFutureDate = (value) => exports.isValidDate(value) && value > new Date().toISOString().slice(0, 10);

exports.isValidDateTime = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return false;
  const [date, time] = value.split('T');
  const [hours, minutes, seconds = '00'] = time.split(':').map(Number);
  return exports.isValidDate(date) && hours < 24 && minutes < 60 && seconds < 60;
};