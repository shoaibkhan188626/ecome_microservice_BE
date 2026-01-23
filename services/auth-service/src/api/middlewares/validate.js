import ResponseHandler from "../../utils/responseHandler.js";

/**
 * Request Validation Middleware
 * validates request body against schema
 */

/**
 * Validate registration data
 */

export const validateRegister = (req, res, next) => {
  const { email, password, firstName, lastName } = req.body;
  const errors = [];

  //email validation
  if (!email || !email.match(/^\S+@\S+\.\S+$/)) {
    errors.push({ field: "email", message: "Valid email is required" });
  }

  //Password validation
  if (!password || password.length < 8) {
    errors.push({
      field: "password",
      message: "Password must be at least 8 characters",
    });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
  if (password && passwordRegex.test(password)) {
    errors.push({
      field: "password",
      message: "Password must contain uppercase, lowercase and number",
    });
  }

  if (!firstName || firstName.trim().length === 0) {
    errors.push({ field: "firstName", message: "First name is required" });
  }

  if (!lastName || lastName.trim().length === 0) {
    errors.push({ field: "lastName", message: "Last name is required" });
  }
  if (errors.length > 0) {
    return ResponseHandler.validationError(res, error);
  }
  next();
};

/**
 * validate login data
 */

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !email.match(/^\S+@\S+\.\S+$/)) {
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

/**
 * validate refresh token request
 */

export const validateRefreshToken = (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return ResponseHandler.validationError(res, [
      { field: "refreshToken", message: "Refresh token is required" },
    ]);
  }
  next();
};

/**
 * validate password change request
 */

export const validatePasswordChange = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const errors = [];

  if (!currentPassword) {
    errors.push({
      field: "currentPassword",
      message: "Current password is required",
    });
  }

  if (!newPassword || newPassword.length < 8) {
    errors.push({
      field: "newPassword",
      message: "New Password must be at least 8 characters",
    });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
  if (newPassword && !passwordRegex.test(newPassword)) {
    errors.push({
      field: "newPassword",
      message: "Password must contain uppercase, lowercase and number",
    });
  }

  if (errors.length > 0) {
    return ResponseHandler.validationError(res, errors);
  }
  next();
};

/**
 * validate profile update request
 */

export const validateProfileUpdate = (req, res, next) => {
  const { firstName, lastName, phone } = req.body;
  const errors = [];

  if (firstName !== undefined && firstName.trim().length === 0) {
    errors.push({ field: "firstName", message: "First name cannot be empty" });
  }

  if (lastName !== undefined && lastName.trim().length === 0) {
    errors.push({ field: "lastName", message: "Last name cannot be empty" });
  }

  if (phone !== undefined && phone && !phone.match(/^\+?[\d\s-()]+$/)) {
    errors.push({ field: "phone", message: "Invalid phone format" });
  }

  if (errors.length > 0) {
    return ResponseHandler.validationError(res, errors);
  }
  next();
};
