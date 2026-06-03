const Session = require('../models/Session');
const Message = require('../models/Message');
const MessageRequest = require('../models/MessageRequest');

// Send a system message in the thread between two users.
// Auto-creates/upgrades the MessageRequest so the thread is accessible.
const postSystemMessage = async (io, fromId, toId, text, sessionId = null) => {
  const fromStr = fromId.toString();
  const toStr = toId.toString();

  // Ensure the conversation is accessible (accepted request)
  const existing = await MessageRequest.findOne({
    $or: [
      { requester: fromStr, recipient: toStr },
      { requester: toStr, recipient: fromStr },
    ],
  });
  if (!existing) {
    await MessageRequest.create({ requester: fromStr, recipient: toStr, status: 'accepted' });
  } else if (existing.status !== 'accepted') {
    existing.status = 'accepted';
    await existing.save();
  }

  const message = await Message.create({
    sender: fromStr,
    recipient: toStr,
    text,
    type: 'system',
    ...(sessionId ? { sessionId } : {}),
  });

  if (io) {
    const payload = {
      _id: message._id,
      sender: fromStr,
      recipient: toStr,
      text: message.text,
      type: 'system',
      ...(sessionId ? { sessionId: sessionId.toString() } : {}),
      read: false,
      createdAt: message.createdAt,
    };
    io.to(`user:${fromStr}`).emit('message:new', payload);
    io.to(`user:${toStr}`).emit('message:new', payload);
  }

  return message;
};

const USER_FIELDS = 'name avatar role sport position skillLevel teamType sportsCoached averageRating ratingCount location';

// POST /api/sessions — post a session need
function computeExpiresAt(date, dateWindowStart, dateWindowEnd) {
  if (date === 'Flexible') {
    if (dateWindowEnd) {
      const d = new Date(dateWindowEnd);
      d.setDate(d.getDate() + 1);
      return d;
    }
    return null;
  }
  const parsed = new Date(date);
  if (!isNaN(parsed.getTime())) {
    parsed.setDate(parsed.getDate() + 1);
    return parsed;
  }
  return null;
}

const createSession = async (req, res) => {
  try {
    const {
      teamType,
      sport,
      position,
      posterRole,
      partnerRole,
      title,
      date,
      time,
      duration,
      location,
      goals,
      notes,
      equipment,
      skillLevelRequired,
      sessionType,
      clinicTitle,
      maxParticipants,
      pricePerAthlete,
      dateWindowStart,
      dateWindowEnd,
      isTraveler,
      source,
    } = req.body;

    if (!sport || !date) {
      return res.status(400).json({ message: 'Sport and date are required' });
    }

    if (date === 'Flexible') {
      if (!dateWindowStart || !dateWindowEnd) {
        return res.status(400).json({ message: 'A date window (start and end) is required for flexible sessions' });
      }
      const start = new Date(dateWindowStart);
      const end = new Date(dateWindowEnd);
      const diffDays = (end - start) / (1000 * 60 * 60 * 24);
      if (diffDays < 0) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }
      if (diffDays > 14) {
        return res.status(400).json({ message: 'Date window cannot exceed two weeks' });
      }
    }

    const session = await Session.create({
      postedBy: req.user._id,
      teamType: teamType || req.user.teamType || '',
      sport,
      position,
      posterRole,
      partnerRole,
      title,
      date,
      time,
      duration,
      location,
      goals,
      notes,
      equipment,
      skillLevelRequired,
      sessionType: sessionType || 'need',
      clinicTitle,
      maxParticipants,
      pricePerAthlete,
      isTraveler: !!isTraveler,
      source: source || 'athletics',
      dateWindowStart: date === 'Flexible' ? dateWindowStart : null,
      dateWindowEnd: date === 'Flexible' ? dateWindowEnd : null,
      expiresAt: computeExpiresAt(date, dateWindowStart, dateWindowEnd),
    });

    await session.populate('postedBy', USER_FIELDS);
    res.status(201).json({ session });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/sessions/available — open sessions not posted by current user
const getAvailableSessions = async (req, res) => {
  try {
    const { sport, skillLevel, location, source, page = 1, limit = 20 } = req.query;

    const query = {
      status: 'open',
      postedBy: { $ne: req.user._id },
      source: source || 'athletics',
    };

    if (sport) query.sport = { $regex: sport, $options: 'i' };
    if (skillLevel) query.skillLevelRequired = skillLevel;
    if (location) query.location = { $regex: location.trim(), $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const sessions = await Session.find(query)
      .populate('postedBy', USER_FIELDS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Session.countDocuments(query);
    res.json({ sessions, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/sessions/my — current user's sessions (posted or as partner)
const getMySessions = async (req, res) => {
  try {
    const { status } = req.query;

    const query = {
      $or: [{ postedBy: req.user._id }, { partner: req.user._id }, { pendingPartners: req.user._id }],
    };

    if (status) {
      const statusList = status.split(',').map((s) => s.trim()).filter(Boolean);
      query.status = statusList.length === 1 ? statusList[0] : { $in: statusList };
    } else {
      // Default: upcoming sessions (open or confirmed)
      query.status = { $in: ['open', 'confirmed'] };
    }

    const sessions = await Session.find(query)
      .populate('postedBy', USER_FIELDS)
      .populate('partner', USER_FIELDS)
      .populate('pendingPartners', USER_FIELDS)
      .sort({ createdAt: -1 });

    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/sessions/:id
const getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('postedBy', USER_FIELDS)
      .populate('partner', USER_FIELDS)
      .populate('pendingPartners', USER_FIELDS)
      .populate('participants', USER_FIELDS);

    if (!session) return res.status(404).json({ message: 'Session not found' });

    res.json({ session });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/sessions/:id — edit a session
const updateSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (session.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this session' });
    }

    if (session.status === 'completed' || session.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot edit a completed or cancelled session' });
    }

    // Non-scheduling fields always apply immediately
    const freeEditFields = ['teamType', 'sport', 'position', 'posterRole', 'partnerRole', 'title', 'goals', 'notes', 'equipment', 'skillLevelRequired'];
    for (const field of freeEditFields) {
      if (req.body[field] !== undefined) session[field] = req.body[field];
    }

    // Scheduling fields require partner approval when session is confirmed with a partner
    const schedulingFields = ['date', 'time', 'location', 'duration'];

    if (session.partner && session.status === 'confirmed') {
      const changedFields = schedulingFields.filter(
        (f) => req.body[f] !== undefined && req.body[f] !== session[f]
      );

      if (changedFields.length > 0) {
        session.pendingChange = {
          date: req.body.date ?? session.date,
          time: req.body.time ?? session.time,
          location: req.body.location ?? session.location,
          duration: req.body.duration ?? session.duration,
          changedFields,
          proposedBy: req.user._id,
          proposedAt: new Date(),
        };

        await session.save();
        await session.populate('postedBy', USER_FIELDS);
        await session.populate('partner', USER_FIELDS);

        const io = req.app.get('io');
        const partnerId = session.partner._id.toString();
        const sessionLabel = session.title || session.sport;

        if (io) {
          io.notify(partnerId, 'change_proposed', {
            sessionId: session._id,
            sessionTitle: sessionLabel,
            sport: session.sport,
            changedFields,
            proposedDate: session.pendingChange.date,
            proposedTime: session.pendingChange.time,
            proposedLocation: session.pendingChange.location,
            proposedBy: { _id: req.user._id, name: req.user.name },
          });
        }

        await postSystemMessage(
          io,
          req.user._id,
          partnerId,
          `${req.user.name} proposed changes to "${sessionLabel}": ${changedFields.join(', ')} updated. Tap to review and approve.`,
          session._id
        );

        return res.json({ session, pendingChangeCreated: true });
      }
    } else {
      // No partner or not confirmed — apply scheduling changes directly
      for (const field of schedulingFields) {
        if (req.body[field] !== undefined) session[field] = req.body[field];
      }
    }

    await session.save();
    await session.populate('postedBy', USER_FIELDS);
    await session.populate('partner', USER_FIELDS);

    res.json({ session });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/sessions/:id/approve-change — partner approves pending scheduling change
const approveChange = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (!session.partner || session.partner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the session partner can approve changes' });
    }
    if (!session.pendingChange) {
      return res.status(400).json({ message: 'No pending change to approve' });
    }

    const { date, time, location, duration } = session.pendingChange;
    session.date = date;
    session.time = time;
    session.location = location;
    session.duration = duration;
    session.pendingChange = null;

    await session.save();
    await session.populate('postedBy', USER_FIELDS);
    await session.populate('partner', USER_FIELDS);

    const io = req.app.get('io');
    const posterId = session.postedBy._id.toString();
    const sessionLabel = session.title || session.sport;

    if (io) {
      io.notify(posterId, 'change_approved', {
        sessionId: session._id,
        sessionTitle: sessionLabel,
        approvedBy: { _id: req.user._id, name: req.user.name },
      });
    }

    await postSystemMessage(
      io,
      req.user._id,
      posterId,
      `✓ ${req.user.name} approved your proposed changes to "${sessionLabel}".`,
      session._id
    );

    res.json({ session });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/sessions/:id/decline-change — partner declines pending scheduling change
const declineChange = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (!session.partner || session.partner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the session partner can decline changes' });
    }
    if (!session.pendingChange) {
      return res.status(400).json({ message: 'No pending change to decline' });
    }

    session.pendingChange = null;
    await session.save();
    await session.populate('postedBy', USER_FIELDS);
    await session.populate('partner', USER_FIELDS);

    const io = req.app.get('io');
    const posterId = session.postedBy._id.toString();
    const sessionLabel = session.title || session.sport;

    if (io) {
      io.notify(posterId, 'change_declined', {
        sessionId: session._id,
        sessionTitle: sessionLabel,
        declinedBy: { _id: req.user._id, name: req.user.name },
      });
    }

    await postSystemMessage(
      io,
      req.user._id,
      posterId,
      `${req.user.name} declined your proposed changes to "${sessionLabel}". Original schedule remains.`,
      session._id
    );

    res.json({ session });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE /api/sessions/:id — cancel a session
const cancelSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (session.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this session' });
    }

    // Capture partner before cancelling (populate if stored as ObjectId)
    const partnerId = session.partner ? session.partner.toString() : null;
    const sessionTitle = session.title || session.sport;
    const sessionDate = session.date;

    session.status = 'cancelled';
    await session.save();

    // Notify partner if there was one
    if (partnerId) {
      const io = req.app.get('io');
      if (io) {
        io.notify(partnerId, 'session_cancelled', {
          sessionId: session._id,
          sessionTitle,
          sport: session.sport,
          date: sessionDate,
          cancelledBy: {
            _id: req.user._id,
            name: req.user.name,
          },
        });
      }

      const dateLabel = sessionDate && sessionDate !== 'Flexible' ? ` on ${sessionDate}` : '';
      await postSystemMessage(
        io,
        req.user._id,
        partnerId,
        `${req.user.name} cancelled the "${sessionTitle}" session${dateLabel}.`,
        session._id
      );
    }

    res.json({ message: 'Session cancelled', session });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/sessions/:id/accept — request to join an open session (inquiry flow)
const acceptSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (session.status !== 'open') {
      return res.status(400).json({ message: 'Session is no longer available' });
    }

    if (session.postedBy.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot join your own session' });
    }

    const alreadyPending = session.pendingPartners.some(
      (id) => id.toString() === req.user._id.toString()
    );
    if (alreadyPending) {
      return res.status(400).json({ message: 'You have already requested to join this session' });
    }

    const isAdditionalRequest = session.pendingPartners.length > 0;
    session.pendingPartners.push(req.user._id);
    await session.save();
    await session.populate('postedBy', USER_FIELDS);
    await session.populate('pendingPartners', USER_FIELDS);

    const io = req.app.get('io');
    const posterId = session.postedBy._id.toString();
    const sessionLabel = session.title || session.sport;
    const dateLabel = session.date && session.date !== 'Flexible' ? ` on ${session.date}` : '';
    const totalPending = session.pendingPartners.length;

    if (io) {
      io.notify(posterId, 'session_inquiry', {
        sessionId: session._id,
        sessionTitle: sessionLabel,
        sport: session.sport,
        date: session.date,
        time: session.time,
        location: session.location,
        requester: {
          _id: req.user._id,
          name: req.user.name,
          avatar: req.user.avatar,
          sport: req.user.sport,
          position: req.user.position,
        },
        totalPending,
      });
    }

    const systemMsg = isAdditionalRequest
      ? `${req.user.name} also wants to join your "${sessionLabel}" session${dateLabel}. You now have ${totalPending} pending requests.`
      : `${req.user.name} has requested to join your "${sessionLabel}" session${dateLabel}. Tap to review their request.`;

    await postSystemMessage(io, req.user._id, posterId, systemMsg, session._id);

    res.json({ session });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/sessions/:id/approve-partner — poster approves one pending partner
// Body: { partnerId } — which requester to approve
const approvePartner = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (session.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the session poster can approve a partner' });
    }

    if (!session.pendingPartners || session.pendingPartners.length === 0) {
      return res.status(400).json({ message: 'No pending requests to approve' });
    }

    // If partnerId supplied use it; otherwise default to first requester
    const partnerId = req.body.partnerId
      ? req.body.partnerId
      : session.pendingPartners[0].toString();

    const isInQueue = session.pendingPartners.some((id) => id.toString() === partnerId);
    if (!isInQueue) {
      return res.status(400).json({ message: 'That user has not requested to join this session' });
    }

    // Decline all other requesters
    const declinedIds = session.pendingPartners
      .map((id) => id.toString())
      .filter((id) => id !== partnerId);

    session.partner = partnerId;
    session.pendingPartners = [];
    session.status = 'confirmed';
    await session.save();
    await session.populate('postedBy', USER_FIELDS);
    await session.populate('partner', USER_FIELDS);

    const io = req.app.get('io');
    const sessionLabel = session.title || session.sport;
    const dateLabel = session.date && session.date !== 'Flexible' ? ` on ${session.date}` : '';

    // Notify approved partner
    if (io) {
      io.notify(partnerId, 'partner_approved', {
        sessionId: session._id,
        sessionTitle: sessionLabel,
        sport: session.sport,
        date: session.date,
        time: session.time,
        location: session.location,
        approvedBy: { _id: req.user._id, name: req.user.name },
      });
    }
    await postSystemMessage(
      io, req.user._id, partnerId,
      `✓ ${req.user.name} approved your request — your "${sessionLabel}" session${dateLabel} is confirmed!`,
      session._id
    );

    // Notify declined partners
    for (const declinedId of declinedIds) {
      if (io) {
        io.notify(declinedId, 'partner_declined', {
          sessionId: session._id,
          sessionTitle: sessionLabel,
          sport: session.sport,
          declinedBy: { _id: req.user._id, name: req.user.name },
        });
      }
      await postSystemMessage(
        io, req.user._id, declinedId,
        `${req.user.name} wasn't able to accept your request to join "${sessionLabel}" this time.`,
        session._id
      );
    }

    res.json({ session });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/sessions/:id/decline-partner — poster declines one pending requester
// Body: { partnerId } — which requester to decline
const declinePartner = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (session.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the session poster can decline a partner' });
    }

    if (!session.pendingPartners || session.pendingPartners.length === 0) {
      return res.status(400).json({ message: 'No pending requests to decline' });
    }

    const partnerId = req.body.partnerId
      ? req.body.partnerId
      : session.pendingPartners[0].toString();

    session.pendingPartners = session.pendingPartners.filter(
      (id) => id.toString() !== partnerId
    );
    await session.save();
    await session.populate('postedBy', USER_FIELDS);
    await session.populate('partner', USER_FIELDS);
    await session.populate('pendingPartners', USER_FIELDS);

    const io = req.app.get('io');
    const sessionLabel = session.title || session.sport;

    if (io) {
      io.notify(partnerId, 'partner_declined', {
        sessionId: session._id,
        sessionTitle: sessionLabel,
        sport: session.sport,
        declinedBy: { _id: req.user._id, name: req.user.name },
      });
    }

    await postSystemMessage(
      io, req.user._id, partnerId,
      `${req.user.name} wasn't able to accept your request to join "${sessionLabel}" this time.`,
      session._id
    );

    res.json({ session });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/sessions/:id/complete — mark a session as completed
const completeSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const isInvolved =
      session.postedBy.toString() === req.user._id.toString() ||
      (session.partner && session.partner.toString() === req.user._id.toString());

    if (!isInvolved) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (session.status !== 'confirmed') {
      return res.status(400).json({ message: 'Only confirmed sessions can be completed' });
    }

    session.status = 'completed';
    await session.save();

    res.json({ message: 'Session marked as completed', session });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/sessions/expired — open sessions posted by the user that are past their date
const getExpiredSessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      postedBy: req.user._id,
      status: 'open',
      expiresAt: { $lt: new Date() },
    })
      .populate('postedBy', USER_FIELDS)
      .sort({ expiresAt: 1 })
      .lean();
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createSession,
  getAvailableSessions,
  getMySessions,
  getExpiredSessions,
  getSessionById,
  updateSession,
  cancelSession,
  acceptSession,
  completeSession,
  approveChange,
  declineChange,
  approvePartner,
  declinePartner,
};
