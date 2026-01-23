import mongoose from "mongoose";
import bcrypt from "bcrypt";
import config from "../../config/index.js";

/**User's Entity with advanced security features
 *
 * Performance optimizations :
 * compound indexes for common queries
 * Lean queries support
 * Select field projection
 */

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minLength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxLength: [50, "First name too long"],
    },

    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxLength: [50, "Last name is too strong"],
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
      index: true,
    },

    isEmailedVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    //security fields
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

    //Oauth fields
    oauthProvider: {
      type: String,
      enum: ["local", "google", "facebook", "github"],
      default: "local",
    },
    oauthId: {
      type: String,
      sparse: true,
    },

    //metadata
    lastLogin: {
      type: Date,
    },
    lastLoginIp: {
      type: String,
    },
  },
  {
    timestamps: true,
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
 * compound indexes for performance
 */

userSchema.index({ email: 1, isActive: 1 }); //common login query
userSchema.index({ role: 1, isActive: 1 }); //role based filtering
userSchema.index({ oauthProvider: 1, oauthId: 1 }); //OAuth lookup
userSchema.index({ createdAt: -1 }); //recent users

/**
 * Virtual for full name
 */

userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

/**virtual to check if account is locked */
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

/**
 * Pre-save hook to hash password
 * uses bcrypt with configurable rounds for security
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(config.security.bcryptRounds);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Method to compare password
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Method to increment login attempts
 * implements account lockout after max attempts
 */

userSchema.methods.incLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  if (
    this.loginAttempts + 1 >= config.security.maxLoginAttempts &&
    !this.isLocked
  ) {
    updates.$set = { lockUntil: Date.now() + config.security.lockoutTime };
  }
  return await this.updateOne(updates);
};

/**
 * Methods to reset Login Attempts
 */

userSchema.methods.resetLoginAttempts = async function () {
  return await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

/**
 * Static method to find by email with active check
 */

userSchema.static.findByEmail = function (email) {
  return this.findOne({ email, isActive: true });
};

/**
 * Static method for lean queries (improves the performance)
 * Returns a Plain JAVASCRIPT object instead of mongoose document
 */

userSchema.static.findByIdLean = function (id) {
  return this.findById(id).lean();
};

const User = mongoose.model("User", userSchema);

export default User;
