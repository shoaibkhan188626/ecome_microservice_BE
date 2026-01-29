/**
 * Reusable validation functions
 */
export const validators = {
  isEmail(email) {
    return /^\S+@\S+\.\S+$/.test(email);
  },

  isStrongPassword(password) {
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password)
    );
  },

  isValidSKU(sku) {
    // Alphanumeric and hyphens only
    return /^[A-Z0-9-]+$/.test(sku);
  },

  isValidPhone(phone) {
    return /^\+?[\d\s-()]+$/.test(phone);
  },

  isPositiveNumber(value) {
    return typeof value === "number" && value > 0;
  },

  isValidMongoId(id) {
    return /^[0-9a-fA-F]{24}$/.test(id);
  },

  sanitizeString(str, maxLength = 255) {
    if (typeof str !== "string") return "";
    return str.trim().substring(0, maxLength);
  },

  isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
};
