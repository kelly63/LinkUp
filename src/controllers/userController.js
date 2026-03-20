const User = require('../models/User');
const Connection = require('../models/Connection');

// GET /api/users — search/discover athletes and coaches
const getUsers = async (req, res) => {
  try {
    const {
      search,
      sport,
      skillLevel,
      role,
      location,
      page = 1,
      limit = 20,
    } = req.query;

    const query = { _id: { $ne: req.user._id } };

    // Text search across name and position
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } },
        { sport: { $regex: search, $options: 'i' } },
      ];
    }

    // Athletics filters
    if (sport) query.sport = { $regex: sport, $options: 'i' };
    if (skillLevel) query.skillLevel = skillLevel;
    if (role) query.role = role;
    if (location) query.location = { $regex: location, $options: 'i' };

    // Visibility filtering: only return users whose visibilityMode allows the requesting user
    // "everyone" users are always visible
    // "filtered" users are visible only if the requester's sport/level passes their allowedSports/allowedLevels
    const visibilityFilter = {
      $or: [
        { visibilityMode: 'everyone' },
        {
          visibilityMode: 'filtered',
          $and: [
            {
              $or: [
                { allowedLevels: { $size: 0 } },
                { allowedLevels: req.user.skillLevel || '' },
              ],
            },
            {
              $or: [
                { allowedSports: { $size: 0 } },
                { allowedSports: req.user.sport || '' },
              ],
            },
          ],
        },
      ],
    };

    // Merge visibility into query
    if (query.$and) {
      query.$and.push(visibilityFilter);
    } else {
      query.$and = [visibilityFilter];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(Number(limit))
      .sort({ averageRating: -1, createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/users/:id
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      'name', 'bio', 'location', 'phone',
      // Athlete fields
      'sport', 'position', 'skillLevel', 'customSportRequest',
      // Coach fields
      'sportsCoached', 'yearsExperience', 'certifications', 'coachingPhilosophy', 'hourlyRate',
      // Privacy
      'visibilityMode', 'allowedLevels', 'allowedSports', 'allowCoaches', 'searchRadius',
      // Social links
      'hudlUrl', 'instagramUrl', 'twitterUrl', 'linkedinUrl',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (req.file) {
      updates.avatar = `/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/users/password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new password are required' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/users/role — toggle between athlete and coach mode
const updateRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['athlete', 'coach'].includes(role)) {
      return res.status(400).json({ message: 'Role must be athlete or coach' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { role },
      { new: true }
    ).select('-password');

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getUsers, getUserById, updateProfile, changePassword, updateRole };
