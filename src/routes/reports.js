const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const SessionReport = require('../models/SessionReport');
const Session = require('../models/Session');

const USER_FIELDS = 'name avatar role';

// POST /api/reports — create or update a session report
router.post('/', protect, async (req, res) => {
  try {
    const { sessionId, reportText, assessmentCategories, areasToWorkOn, focusAreas } = req.body;
    if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the session coach can write a report' });
    }

    const report = await SessionReport.findOneAndUpdate(
      { session: sessionId },
      {
        session: sessionId,
        coach: req.user._id,
        athlete: session.partner || null,
        reportText: reportText || '',
        assessmentCategories: assessmentCategories || [],
        areasToWorkOn: areasToWorkOn || '',
        focusAreas: focusAreas || '',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await report.populate('coach', USER_FIELDS);
    await report.populate('athlete', USER_FIELDS);
    res.json({ report });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/reports/session/:sessionId
router.get('/session/:sessionId', protect, async (req, res) => {
  try {
    const report = await SessionReport.findOne({ session: req.params.sessionId })
      .populate('coach', USER_FIELDS)
      .populate('athlete', USER_FIELDS);
    if (!report) return res.status(404).json({ message: 'No report found' });
    res.json({ report });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/reports/coach/:coachId — all reports written by a coach (public)
router.get('/coach/:coachId', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const reports = await SessionReport.find({ coach: req.params.coachId })
      .populate('session', 'sport title date sessionType')
      .populate('athlete', USER_FIELDS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    const total = await SessionReport.countDocuments({ coach: req.params.coachId });
    res.json({ reports, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/reports/my — reports written by the logged-in coach
router.get('/my', protect, async (req, res) => {
  try {
    const reports = await SessionReport.find({ coach: req.user._id })
      .populate('session', 'sport title date sessionType status')
      .populate('athlete', USER_FIELDS)
      .sort({ createdAt: -1 });
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/reports/my-sessions — completed sessions by the coach that need/have reports
router.get('/my-sessions', protect, async (req, res) => {
  try {
    const sessions = await Session.find({
      postedBy: req.user._id,
      status: { $in: ['completed', 'confirmed'] },
    })
      .populate('partner', USER_FIELDS)
      .sort({ createdAt: -1 })
      .limit(50);

    const sessionIds = sessions.map(s => s._id);
    const reports = await SessionReport.find({ session: { $in: sessionIds } }).select('session');
    const reportedIds = new Set(reports.map(r => r.session.toString()));

    res.json({
      sessions: sessions.map(s => ({
        ...s.toObject(),
        hasReport: reportedIds.has(s._id.toString()),
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
