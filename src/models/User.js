const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Core identity
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    phone: {
      type: String,
      default: '',
    },

    // Role
    role: {
      type: String,
      enum: ['athlete', 'coach'],
      default: 'athlete',
    },

    // Profile
    avatar: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      maxlength: 500,
      default: '',
    },
    location: {
      type: String,
      maxlength: 100,
      default: '',
    },

    // Athlete-specific fields
    sport: {
      type: String,
      default: '',
    },
    position: {
      type: String,
      default: '',
    },
    skillLevel: {
      type: String,
      enum: ['NCAA D1', 'NCAA D2', 'NCAA D3', 'College - Other', 'Pro', 'Athlete - Other', ''],
      default: '',
    },
    customSportRequest: {
      type: String,
      default: '',
    },

    // Coach-specific fields
    sportsCoached: {
      type: [String],
      default: [],
    },
    yearsExperience: {
      type: String,
      default: '',
    },
    certifications: {
      type: String,
      default: '',
    },
    coachingPhilosophy: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    hourlyRate: {
      type: Number,
      default: null,
    },

    // Privacy & visibility
    visibilityMode: {
      type: String,
      enum: ['everyone', 'filtered'],
      default: 'filtered',
    },
    allowedLevels: {
      type: [String],
      default: [],
    },
    allowedSports: {
      type: [String],
      default: [],
    },
    allowCoaches: {
      type: Boolean,
      default: true,
    },
    searchRadius: {
      type: Number,
      default: 25,
    },

    // Agreement
    signature: {
      type: String,
      default: '',
    },
    agreedToTerms: {
      type: Boolean,
      default: false,
    },
    agreedToPrivacyPolicy: {
      type: Boolean,
      default: false,
    },
    ageVerified: {
      type: Boolean,
      default: false,
    },
    agreedAt: {
      type: Date,
      default: null,
    },

    // Social links
    hudlUrl: { type: String, default: '' },
    instagramUrl: { type: String, default: '' },
    twitterUrl: { type: String, default: '' },
    linkedinUrl: { type: String, default: '' },
    rosterUrl: { type: String, default: '' },

    // Rating stats (denormalized for performance)
    averageRating: {
      type: Number,
      default: 0,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },

    // Status
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
