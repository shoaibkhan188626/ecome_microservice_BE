import bcrypt from "bcryptjs";

/**
 * Password Helper - Shared password operations
 */
export class PasswordHelper {
  constructor(saltRounds = 12) {
    this.saltRounds = saltRounds;
  }

  async hash(password) {
    const salt = await bcrypt.genSalt(this.saltRounds);
    return await bcrypt.hash(password, salt);
  }

  async compare(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  validateStrength(password) {
    const errors = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
