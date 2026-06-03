const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    // Who posted this need
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Team type (men's / women's)
    teamType: {
      type: String,
      enum: ['mens', 'womens', ''],
      default: '',
    },

    // Sport and roles
    sport: {
      type: String,
      required: [true, 'Sport is required'],
    },
    position: {
      type: String,
      default: '',
    },
    // What role the poster plays
    posterRole: {
      type: String,
      default: '',
    },
    // What partner role they're looking for
    partnerRole: {
      type: String,
      default: '',
    },

    // Session details
    title: {
      type: String,
      default: '',
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
    },
    time: {
      type: String,
      default: '',
    },
    duration: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
    },

    // Goals and notes
    goals: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    equipment: {
      type: [String],
      default: [],
    },

    // Skill level requirement
    skillLevelRequired: {
      type: String,
      default: '',
    },

    // Status flow: open → confirmed → completed | cancelled
    status: {
      type: String,
      enum: ['open', 'confirmed', 'completed', 'cancelled'],
      default: 'open',
    },

    // The partner who accepted
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Users who have requested to join but not yet been approved
    pendingPartners: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],

    // Pending change proposed by the poster, awaiting partner approval
    pendingChange: {
      type: {
        date: String,
        time: String,
        location: String,
        duration: String,
        changedFields: [String],
        proposedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        proposedAt: { type: Date, default: Date.now },
      },
      default: null,
    },

    // Flexible date window (used when date === 'Flexible')
    dateWindowStart: { type: Date, default: null },
    dateWindowEnd: { type: Date, default: null },

    // Computed expiry — when date is past and session should prompt repost/remove
    expiresAt: { type: Date, default: null },

    // Poster is traveling to the session location (not at their home base)
    isTraveler: { type: Boolean, default: false },

    // Which app created this session
    source: {
      type: String,
      enum: ['athletics', 'nextgen'],
      default: 'athletics',
    },

    // Type of session
    sessionType: {
      type: String,
      enum: ['need', 'clinic'],
      default: 'need',
    },

    // Clinic-specific fields
    clinicTitle: { type: String, default: '' },
    maxParticipants: { type: Number, default: null },
    pricePerAthlete: { type: Number, default: null },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Attached media (images and PDFs)
    media: {
      type: [{
        url: { type: String, required: true },
        publicId: { type: String, default: '' },
        type: { type: String, enum: ['image', 'pdf'], required: true },
        name: { type: String, default: '' },
      }],
      default: [],
    },
  },
  { timestamps: true }
);

sessionSchema.index({ postedBy: 1, status: 1 });
sessionSchema.index({ partner: 1, status: 1 });
sessionSchema.index({ sport: 1, status: 1 });

module.exports = mongoose.model('Session', sessionSchema);
