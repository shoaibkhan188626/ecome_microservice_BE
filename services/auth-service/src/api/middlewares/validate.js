import { ResponseHandler, validators } from "@ecommerce/common";

export const validateRegister = (req, res, next) => {
  const { email, password, firstName, lastName } = req.body;
  const errors = [];

  if (!validators.isEmail(email)) {
    errors.push({ field: "email", message: "Valid email is required" });
  }

  const passwordCheck = validators.isStrongPassword(password);
  if (!passwordCheck) {
    errors.push({
      field: "password",
      message:
        "Password must be at least 8 characters with uppercase, lowercase, and number",
    });
  }

  if (!firstName || firstName.trim().length === 0) {
    errors.push({ field: "firstName", message: "First name is required" });
  }

  if (!lastName || lastName.trim().length === 0) {
    errors.push({ field: "lastName", message: "Last name is required" });
  }

  if (errors.length > 0) {
    return ResponseHandler.validationError(res, errors);
  }

  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!validators.isEmail(email)) {
    errors.push({ field: "email", message: "Valid email is required" });
  }

  if (!password) {
    errors.push({ field: "password", message: "Password is required" });
  }

  if (errors.length > 0) {
    return ResponseHandler.validationError(res, errors);
  }

  next();
};

export const validateRefreshToken = (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return ResponseHandler.validationError(res, [
      { field: "refreshToken", message: "Refresh token is required" },
    ]);
  }

  next();
};

export const validatePasswordChange = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const errors = [];

  if (!currentPassword) {
    errors.push({
      field: "currentPassword",
      message: "Current password is required",
    });
  }

  const passwordCheck = validators.isStrongPassword(newPassword);
  if (!passwordCheck) {
    errors.push({
      field: "newPassword",
      message:
        "Password must be at least 8 characters with uppercase, lowercase, and number",
    });
  }

  if (errors.length > 0) {
    return ResponseHandler.validationError(res, errors);
  }

  next();
};

export const validateProfileUpdate = (req, res, next) => {
  const { firstName, lastName, phone } = req.body;
  const errors = [];

  if (firstName !== undefined && firstName.trim().length === 0) {
    errors.push({ field: "firstName", message: "First name cannot be empty" });
  }

  if (lastName !== undefined && lastName.trim().length === 0) {
    errors.push({ field: "lastName", message: "Last name cannot be empty" });
  }

  if (phone !== undefined && phone && !validators.isValidPhone(phone)) {
    errors.push({ field: "phone", message: "Invalid phone format" });
  }

  if (errors.length > 0) {
    return ResponseHandler.validationError(res, errors);
  }

  next();
};
