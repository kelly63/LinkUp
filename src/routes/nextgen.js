const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// GET /api/nextgen/children — get current parent's children
router.get('/children', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('children');
    res.json({ children: user.children || [] });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/nextgen/children — add a child
router.post('/children', protect, async (req, res) => {
  try {
    const { name, age, sports, skillLevel, notes } = req.body;
    if (!name) return res.status(400).json({ message: 'Child name is required' });
    const user = await User.findById(req.user._id);
    user.children.push({ name, age, sports: sports || [], skillLevel: skillLevel || '', notes: notes || '' });
    await user.save();
    res.status(201).json({ children: user.children });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/nextgen/children/:childId — update a child
router.put('/children/:childId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const child = user.children.id(req.params.childId);
    if (!child) return res.status(404).json({ message: 'Child not found' });
    const { name, age, sports, skillLevel, notes } = req.body;
    if (name !== undefined) child.name = name;
    if (age !== undefined) child.age = age;
    if (sports !== undefined) child.sports = sports;
    if (skillLevel !== undefined) child.skillLevel = skillLevel;
    if (notes !== undefined) child.notes = notes;
    await user.save();
    res.json({ children: user.children });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/nextgen/children/:childId — remove a child
router.delete('/children/:childId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.children = user.children.filter(c => c._id.toString() !== req.params.childId);
    await user.save();
    res.json({ children: user.children });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/nextgen/coaches — search coaches (role=coach, filtered for NextGen use)
router.get('/coaches', protect, async (req, res) => {
  try {
    const { sport, ageGroup, maxRate, search, page = 1, limit = 20 } = req.query;
    const query = { role: 'coach' };
    if (sport) query.sportsCoached = { $in: [new RegExp(sport, 'i')] };
    if (ageGroup) query.ageGroupsCoached = { $in: [ageGroup] };
    if (maxRate) query.hourlyRate = { $lte: Number(maxRate) };
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } },
    ];
    const skip = (Number(page) - 1) * Number(limit);
    const coaches = await User.find(query)
      .select('name avatar location sport sportsCoached hourlyRate ageGroupsCoached averageRating ratingCount yearsExperience certifications bio')
      .sort({ averageRating: -1, ratingCount: -1 })
      .skip(skip)
      .limit(Number(limit));
    const total = await User.countDocuments(query);
    res.json({ coaches, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
