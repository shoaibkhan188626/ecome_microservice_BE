import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import config from "../../config/index.js";

/**
 * User Entity with advanced security features
 *
 * Performance Optimizations:
 * - Compound indexes for common queries
 * - Lean queries support
 * - Select field projection
 *
 * Time Complexity for queries with indexes: O(log n)
 */

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true, // O(log n) lookup
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Don't return password by default
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name too long"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name too long"],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s-()]+$/, "Invalid phone format"],
    },
    role: {
      type: String,
      enum: Object.values(config.roles),
      default: config.roles.CUSTOMER,
      index: true, // For role-based queries
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true, // For filtering active users
    },
    // Security fields
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
    },
    refreshTokens: [
      {
        token: String,
        createdAt: { type: Date, default: Date.now },
        expiresAt: Date,
      },
    ],
    // OAuth fields
    oauthProvider: {
      type: String,
      enum: ["local", "google", "facebook", "github"],
      default: "local",
    },
    oauthId: {
      type: String,
      sparse: true, // Allows null values with index
    },
    // Metadata
    lastLogin: {
      type: Date,
    },
    lastLoginIp: {
      type: String,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.__v;
        return ret;
      },
    },
  },
);

/**
 * Compound Indexes for Performance
 * O(log n) lookup time for indexed queries
 */
userSchema.index({ email: 1, isActive: 1 }); // Common login query
userSchema.index({ role: 1, isActive: 1 }); // Role-based filtering
userSchema.index({ oauthProvider: 1, oauthId: 1 }); // OAuth lookup
userSchema.index({ createdAt: -1 }); // Recent users

/**
 * Virtual for full name
 * Time Complexity: O(1)
 */
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

/**
 * Virtual to check if account is locked
 * Time Complexity: O(1)
 */
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

/**
 * Pre-save hook to hash password
 * Time Complexity: O(1) but computationally expensive (intentional)
 * Uses bcrypt with configurable rounds for security
 */
userSchema.pre('save', async function() {
  // Only hash if password is modified
  if (!this.isModified('password')) return;

  try {
    // Hash password with salt rounds from config
    const salt = await bcrypt.genSalt(config.security.bcryptRounds);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = Date.now();
  } catch (error) {
    throw error; // Let error propagate
  }
});

/**
 * Method to compare password
 * Time Complexity: O(1) but computationally expensive
 *
 * @param {string} candidatePassword - Password to check
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Method to increment login attempts
 * Implements account lockout after max attempts
 * Time Complexity: O(1) + database write
 */
userSchema.methods.incLoginAttempts = async function () {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account if max attempts exceeded
  if (
    this.loginAttempts + 1 >= config.security.maxLoginAttempts &&
    !this.isLocked
  ) {
    updates.$set = { lockUntil: Date.now() + config.security.lockoutTime };
  }

  return await this.updateOne(updates);
};

/**
 * Method to reset login attempts
 * Time Complexity: O(1) + database write
 */
userSchema.methods.resetLoginAttempts = async function () {
  return await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

/**
 * Static method to find by email with active check
 * Time Complexity: O(log n) due to compound index
 */
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email, isActive: true });
};

/**
 * Static method for lean queries (better performance)
 * Returns plain JavaScript objects instead of Mongoose documents
 * Time Complexity: O(log n) with index
 */
userSchema.statics.findByIdLean = function (id) {
  return this.findById(id).lean();
};

const User = mongoose.model("User", userSchema);

export default User;
