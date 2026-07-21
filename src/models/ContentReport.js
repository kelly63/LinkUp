const mongoose = require('mongoose');

const contentReportSchema = new mongoose.Schema(
  {
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['post', 'user'], required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
    reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'reviewed', 'dismissed'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ContentReport', contentReportSchema);
