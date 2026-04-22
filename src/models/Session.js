const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    // Who posted this need
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

    // A user who has requested to join but not yet been approved
    pendingPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

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
  },
  { timestamps: true }
);

sessionSchema.index({ postedBy: 1, status: 1 });
sessionSchema.index({ partner: 1, status: 1 });
sessionSchema.index({ sport: 1, status: 1 });

module.exports = mongoose.model('Session', sessionSchema);
