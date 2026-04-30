const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { sendVerificationEmail } = require('../utils/email');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'linkup-admin-secret';
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const {
      // Required core fields
      fullName,
      name,
      email,
      password,
      // Optional basic
      phone,
      location,
      // Role
      userType,
      role,
      // Athlete fields
      sport,
      position,
      skillLevel,
      customSportRequest,
      // Coach fields
      sportsCoached,
      yearsExperience,
      certifications,
      coachingPhilosophy,
      hourlyRate,
      // Privacy
      visibilityMode,
      allowedLevels,
      allowedSports,
      allowCoaches,
      searchRadius,
      // Agreement
      signature,
      agreedToTerms,
      agreedToPrivacyPolicy,
      ageVerified,
      // Verification
      verificationRosterUrl,
      verificationNote,
    } = req.body;

    const displayName = fullName || name;
    if (!displayName || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const userData = {
      name: displayName,
      email,
      password,
      role: userType || role || 'athlete',
    };

    // Optional fields
    if (phone) userData.phone = phone;
    if (location) userData.location = location;
    if (sport) userData.sport = sport;
    if (position) userData.position = position;
    if (skillLevel) userData.skillLevel = skillLevel;
    if (customSportRequest) userData.customSportRequest = customSportRequest;
    if (sportsCoached) userData.sportsCoached = sportsCoached;
    if (yearsExperience) userData.yearsExperience = yearsExperience;
    if (certifications) userData.certifications = certifications;
    if (coachingPhilosophy) userData.coachingPhilosophy = coachingPhilosophy;
    if (hourlyRate != null) userData.hourlyRate = hourlyRate;
    if (visibilityMode) userData.visibilityMode = visibilityMode;
    if (allowedLevels) userData.allowedLevels = allowedLevels;
    if (allowedSports) userData.allowedSports = allowedSports;
    if (allowCoaches != null) userData.allowCoaches = allowCoaches;
    if (searchRadius) userData.searchRadius = Number(searchRadius);
    if (signature) userData.signature = signature;
    if (agreedToTerms) userData.agreedToTerms = true;
    if (agreedToPrivacyPolicy) userData.agreedToPrivacyPolicy = true;
    if (ageVerified) userData.ageVerified = true;
    if (agreedToTerms || agreedToPrivacyPolicy) userData.agreedAt = new Date();
    if (verificationRosterUrl) userData.verificationRosterUrl = verificationRosterUrl;
    if (verificationNote) userData.verificationNote = verificationNote;
    if (verificationRosterUrl || verificationNote) userData.verificationStatus = 'pending';

    const user = await User.create(userData);
    const token = generateToken(user._id);

    if (verificationRosterUrl || verificationNote) {
      const userIdStr = user._id.toString();
      const approveToken = jwt.sign({ userId: userIdStr, action: 'approve' }, ADMIN_SECRET, { expiresIn: '7d' });
      const rejectToken  = jwt.sign({ userId: userIdStr, action: 'reject'  }, ADMIN_SECRET, { expiresIn: '7d' });
      const approveUrl = `${APP_URL}/api/admin/verify/${userIdStr}/approve?token=${approveToken}`;
      const rejectUrl  = `${APP_URL}/api/admin/verify/${userIdStr}/reject?token=${rejectToken}`;
      sendVerificationEmail({ user, approveUrl, rejectUrl }).catch((err) =>
        console.error('[verification email]', err.message)
      );
    }

    res.status(201).json({ token, user: user.toPublicJSON() });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    res.json({ token, user: user.toPublicJSON() });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    req.user.isOnline = false;
    req.user.lastSeen = new Date();
    await req.user.save({ validateBeforeSave: false });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
};

// POST /api/auth/google
const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'idToken is required' });

    // Verify the token with Google — accepts both web and iOS client IDs
    const clientIds = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
    ].filter(Boolean);

    let payload;
    for (const audience of clientIds) {
      try {
        const ticket = await googleClient.verifyIdToken({ idToken, audience });
        payload = ticket.getPayload();
        break;
      } catch (_) {}
    }
    if (!payload) return res.status(401).json({ message: 'Invalid Google token' });

    const { sub: googleId, email, name, picture } = payload;

    // Find existing user by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Link googleId if they previously signed up with email
      if (!user.googleId) {
        user.googleId = googleId;
        if (!user.avatar && picture) user.avatar = picture;
        await user.save({ validateBeforeSave: false });
      }
    } else {
      // New user — create with Google info, no password
      user = await User.create({
        name,
        email,
        googleId,
        avatar: picture || '',
        agreedToTerms: false,
        role: 'athlete',
      });
    }

    const token = generateToken(user._id);
    res.json({ token, user: user.toPublicJSON(), isNewUser: !user.agreedToTerms });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Google sign-in failed' });
  }
};

module.exports = { register, login, logout, getMe, googleAuth };
