const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

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
      teamType,
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
      searchNorthAmerica,
      // Agreement
      signature,
      agreedToTerms,
      agreedToPrivacyPolicy,
      ageVerified,
      // Verification
      verificationRosterUrl,
      verificationNote,
      school,
      ngbMemberId,
    } = req.body;

    const displayName = fullName || name;
    if (!displayName || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const incomingRole = userType || role || 'athlete';
    const existing = await User.findOne({ email, role: incomingRole });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const userData = {
      name: displayName,
      email,
      password,
      role: incomingRole,
    };

    // Optional fields
    if (phone) userData.phone = phone;
    if (location) userData.location = location;
    if (teamType) userData.teamType = teamType;
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
    if (searchNorthAmerica != null) userData.searchNorthAmerica = searchNorthAmerica;
    if (signature) userData.signature = signature;
    if (agreedToTerms) userData.agreedToTerms = true;
    if (agreedToPrivacyPolicy) userData.agreedToPrivacyPolicy = true;
    if (ageVerified) userData.ageVerified = true;
    if (agreedToTerms || agreedToPrivacyPolicy) userData.agreedAt = new Date();
    if (school) userData.school = school;
    if (ngbMemberId) userData.ngbMemberId = ngbMemberId;
    if (verificationRosterUrl) userData.verificationRosterUrl = verificationRosterUrl;
    if (verificationNote) userData.verificationNote = verificationNote;
    if (verificationRosterUrl || verificationNote) userData.verificationStatus = 'pending';

    const user = await User.create(userData);
    const token = generateToken(user._id);

    if (incomingRole === 'athlete') {
      const userIdStr = user._id.toString();
      const approveToken = jwt.sign({ userId: userIdStr, action: 'approve' }, ADMIN_SECRET, { expiresIn: '30d' });
      const clarifyToken = jwt.sign({ userId: userIdStr, action: 'clarify' }, ADMIN_SECRET, { expiresIn: '30d' });
      const approveUrl = `${APP_URL}/api/admin/verify/${userIdStr}/approve?token=${approveToken}`;
      const clarifyUrl = `${APP_URL}/api/admin/verify/${userIdStr}/clarify?token=${clarifyToken}`;
      if (userData.verificationStatus !== 'pending') userData.verificationStatus = 'pending';
      sendVerificationEmail({ user, approveUrl, clarifyUrl }).catch((err) =>
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
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const query = role ? { email, role } : { email };
    const user = await User.findOne(query).select('+password');
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

    let isNewUser = false;
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
      isNewUser = true;
    }

    // Send verification email for new Google-registered athletes
    if (isNewUser && user.role === 'athlete') {
      const userIdStr = user._id.toString();
      const approveToken = jwt.sign({ userId: userIdStr, action: 'approve' }, ADMIN_SECRET, { expiresIn: '30d' });
      const clarifyToken = jwt.sign({ userId: userIdStr, action: 'clarify' }, ADMIN_SECRET, { expiresIn: '30d' });
      const approveUrl = `${APP_URL}/api/admin/verify/${userIdStr}/approve?token=${approveToken}`;
      const clarifyUrl = `${APP_URL}/api/admin/verify/${userIdStr}/clarify?token=${clarifyToken}`;
      sendVerificationEmail({ user, approveUrl, clarifyUrl }).catch((err) =>
        console.error('[verification email google]', err.message)
      );
    }

    const token = generateToken(user._id);
    res.json({ token, user: user.toPublicJSON(), isNewUser: isNewUser || !user.agreedToTerms });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Google sign-in failed' });
  }
};

// POST /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    const user = await User.findById(req.user._id).select('+password');
    if (!user.password) {
      return res.status(400).json({ message: 'This account uses Google sign-in — no password to change' });
    }
    const match = await user.comparePassword(currentPassword);
    if (!match) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    console.log('[forgot-password] request for:', email);
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.log('[forgot-password] no user found');
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    if (!user.password) {
      console.log('[forgot-password] account has no password (Google sign-in)');
      return res.status(400).json({ message: 'This account uses Google Sign-In. Please sign in with Google instead.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${APP_URL}/reset-password.html?token=${rawToken}`;
    await sendPasswordResetEmail({ toEmail: user.email, toName: user.name, resetUrl });
    console.log('[forgot-password] email sent to:', user.email);

    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('forgot-password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/auth/reset-password/:token
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Password updated successfully. You can now sign in.' });
  } catch (error) {
    console.error('reset-password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, logout, getMe, googleAuth, changePassword, forgotPassword, resetPassword };
