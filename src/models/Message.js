const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      maxlength: 2000,
      default: '',
    },
    read: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ['user', 'system', 'booking_request'],
      default: 'user',
    },
    bookingData: {
      sessionType: { type: String, enum: ['lesson', 'call'] },
      proposedDate: { type: String, default: '' },
      proposedTime: { type: String, default: '' },
      duration: { type: String, default: '' },
      notes: { type: String, default: '' },
      status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for fast conversation thread queries
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, read: 1 }); // For unread count

module.exports = mongoose.model('Message', messageSchema);
