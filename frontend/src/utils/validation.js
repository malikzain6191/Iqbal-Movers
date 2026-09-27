export const CITY_NAME_PATTERN = "[A-Za-z]+(?: +[A-Za-z]+)*";
export const PERSON_NAME_PATTERN = "[A-Za-z]+(?:[ '-][A-Za-z]+)*";
export const PHONE_PATTERN = "(?=(?:\\D*\\d){7,15}\\D*$)\\+?[0-9][0-9 ()-]{6,19}";
export const USERNAME_PATTERN = "[A-Za-z0-9][A-Za-z0-9._-]{2,29}";

export const normalizeText = (value) => value.trim().replace(/\s+/g, ' ');
export const normalizedKey = (value) => normalizeText(value).toLocaleLowerCase();

export function optionalPhoneIsValid(value) {
  if (!value) return true;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15 && new RegExp(`^${PHONE_PATTERN}$`).test(value.trim());
}