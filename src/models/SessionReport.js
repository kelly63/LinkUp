const mongoose = require('mongoose');

const sessionReportSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    coach: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    athlete: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Open text session summary
    reportText: {
      type: String,
      default: '',
    },
    // Coach-defined categories with star ratings (1-5)
    assessmentCategories: {
      type: [{
        name: { type: String, required: true },
        rating: { type: Number, min: 1, max: 5, required: true },
      }],
      default: [],
    },
    // Areas the athlete needs to work on
    areasToWorkOn: {
      type: String,
      default: '',
    },
    // What the coach will focus on in future sessions
    focusAreas: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

sessionReportSchema.index({ session: 1 }, { unique: true });
sessionReportSchema.index({ coach: 1 });
sessionReportSchema.index({ athlete: 1 });

module.exports = mongoose.model('SessionReport', sessionReportSchema);
