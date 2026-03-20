const Session = require('../models/Session');

const USER_FIELDS = 'name avatar role sport position skillLevel sportsCoached averageRating ratingCount location';

// POST /api/sessions — post a session need
const createSession = async (req, res) => {
  try {
    const {
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
    } = req.body;

    if (!sport || !date) {
      return res.status(400).json({ message: 'Sport and date are required' });
    }

    const session = await Session.create({
      postedBy: req.user._id,
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
    const { sport, skillLevel, page = 1, limit = 20 } = req.query;

    const query = {
      status: 'open',
      postedBy: { $ne: req.user._id },
    };

    if (sport) query.sport = { $regex: sport, $options: 'i' };
    if (skillLevel) query.skillLevelRequired = skillLevel;

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
      $or: [{ postedBy: req.user._id }, { partner: req.user._id }],
    };

    if (status) {
      query.status = status;
    } else {
      // Default: upcoming sessions (open or confirmed)
      query.status = { $in: ['open', 'confirmed'] };
    }

    const sessions = await Session.find(query)
      .populate('postedBy', USER_FIELDS)
      .populate('partner', USER_FIELDS)
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

    const editableFields = [
      'sport', 'position', 'posterRole', 'partnerRole', 'title',
      'date', 'time', 'duration', 'location', 'goals', 'notes',
      'equipment', 'skillLevelRequired',
    ];

    for (const field of editableFields) {
      if (req.body[field] !== undefined) session[field] = req.body[field];
    }

    await session.save();
    await session.populate('postedBy', USER_FIELDS);
    await session.populate('partner', USER_FIELDS);

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

    session.status = 'cancelled';
    await session.save();

    res.json({ message: 'Session cancelled', session });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/sessions/:id/accept — accept an open session need (become partner)
const acceptSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (session.status !== 'open') {
      return res.status(400).json({ message: 'Session is no longer available' });
    }

    if (session.postedBy.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot accept your own session' });
    }

    session.partner = req.user._id;
    session.status = 'confirmed';
    await session.save();
    await session.populate('postedBy', USER_FIELDS);
    await session.populate('partner', USER_FIELDS);

    // Notify the session poster
    const io = req.app.get('io');
    if (io) {
      io.notify(session.postedBy._id.toString(), 'session_accepted', {
        sessionId: session._id,
        sport: session.sport,
        date: session.date,
        time: session.time,
        location: session.location,
        partner: {
          _id: req.user._id,
          name: req.user.name,
          avatar: req.user.avatar,
          sport: req.user.sport,
          position: req.user.position,
        },
      });
    }

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

module.exports = {
  createSession,
  getAvailableSessions,
  getMySessions,
  getSessionById,
  updateSession,
  cancelSession,
  acceptSession,
  completeSession,
};
