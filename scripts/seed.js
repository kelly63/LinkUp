/**
 * LinkUp database seed script
 * Run: node scripts/seed.js
 * Clears all collections, then inserts realistic test data.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../src/models/User');
const Connection = require('../src/models/Connection');
const Message = require('../src/models/Message');
const Session = require('../src/models/Session');
const Rating = require('../src/models/Rating');
const Post = require('../src/models/Post');

// ─── Helpers ────────────────────────────────────────────────────────────────
const hash = (pw) => bcrypt.hash(pw, 10);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ─── Raw user definitions (password will be hashed) ──────────────────────────
const rawUsers = [
  // Athletes
  {
    name: 'Jake Torres',
    email: 'jake@example.com',
    password: 'Password1!',
    role: 'athlete',
    sport: 'Baseball',
    position: 'Pitcher (RHP)',
    skillLevel: 'NCAA D1',
    location: 'San Diego, CA',
    bio: 'RHP at SDSU. Working on developing a 4-seam fastball command and improving my slider.',
    hudlUrl: 'https://www.hudl.com/profile/fake/jake',
    averageRating: 4.8,
    ratingCount: 12,
  },
  {
    name: 'Mike Johnson',
    email: 'mike@example.com',
    password: 'Password1!',
    role: 'athlete',
    sport: 'Baseball',
    position: 'Catcher',
    skillLevel: 'NCAA D2',
    location: 'San Diego, CA',
    bio: 'Catcher looking for pitchers to throw bullpens. Great framing and game-calling ability.',
    averageRating: 4.5,
    ratingCount: 8,
  },
  {
    name: 'Sarah Williams',
    email: 'sarah@example.com',
    password: 'Password1!',
    role: 'athlete',
    sport: 'Softball',
    position: 'Pitcher (RHP)',
    skillLevel: 'NCAA D1',
    location: 'Chula Vista, CA',
    bio: 'Softball pitcher focused on rise ball and screwball. Looking for catchers to work on pitching drills.',
    averageRating: 4.9,
    ratingCount: 15,
  },
  {
    name: 'David Chen',
    email: 'david@example.com',
    password: 'Password1!',
    role: 'athlete',
    sport: 'Baseball',
    position: 'Catcher',
    skillLevel: 'NCAA D3',
    location: 'El Cajon, CA',
    bio: 'Transfer catcher with strong arm. Available afternoons and weekends.',
    averageRating: 4.2,
    ratingCount: 5,
  },
  {
    name: 'Emma Davis',
    email: 'emma@example.com',
    password: 'Password1!',
    role: 'athlete',
    sport: 'Basketball',
    position: 'Point Guard',
    skillLevel: 'NCAA D2',
    location: 'San Diego, CA',
    bio: '5\'6" point guard working on pull-up jumper and ball-handling in traffic.',
    averageRating: 4.6,
    ratingCount: 7,
  },
  {
    name: 'Tyler Martinez',
    email: 'tyler@example.com',
    password: 'Password1!',
    role: 'athlete',
    sport: 'Baseball',
    position: 'Pitcher (LHP)',
    skillLevel: 'NCAA D1',
    location: 'Mission Valley, CA',
    bio: 'LHP with a nasty curveball. Need experienced catchers to throw live AB sessions.',
    averageRating: 4.7,
    ratingCount: 9,
  },
  // Coaches
  {
    name: 'Coach Rodriguez',
    email: 'coach.rod@example.com',
    password: 'Password1!',
    role: 'coach',
    sportsCoached: ['Baseball', 'Softball'],
    yearsExperience: '15+',
    certifications: 'USA Baseball Level 3, NSCA-CSCS',
    coachingPhilosophy:
      'Mechanics-first approach combined with mental toughness training. Every rep should have purpose.',
    hourlyRate: 85,
    location: 'San Diego, CA',
    bio: 'Former MiLB pitcher turned pitching coach. Specializing in velocity development and arm health.',
    averageRating: 4.9,
    ratingCount: 24,
  },
  {
    name: 'Coach Martinez',
    email: 'coach.martinez@example.com',
    password: 'Password1!',
    role: 'coach',
    sportsCoached: ['Baseball'],
    yearsExperience: '8',
    certifications: 'USA Baseball Level 2',
    coachingPhilosophy: 'Data-driven coaching using TrackMan analytics and video breakdown.',
    hourlyRate: 65,
    location: 'Chula Vista, CA',
    bio: 'Bullpen design specialist. Helping pitchers build deeper arsenals and attack hitter weaknesses.',
    averageRating: 4.7,
    ratingCount: 11,
  },
];

// ─── Main seed function ───────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear all collections
  await Promise.all([
    User.deleteMany({}),
    Connection.deleteMany({}),
    Message.deleteMany({}),
    Session.deleteMany({}),
    Rating.deleteMany({}),
    Post.deleteMany({}),
  ]);
  console.log('Collections cleared');

  // Create users with hashed passwords
  const users = await Promise.all(
    rawUsers.map(async (u) => {
      const hashed = await hash(u.password);
      return User.create({ ...u, password: hashed });
    })
  );

  const [jake, mike, sarah, david, emma, tyler, coachRod, coachMartinez] = users;
  console.log(`Created ${users.length} users`);

  // ── Connections (roster relationships) ────────────────────────────────────
  const connections = await Connection.insertMany([
    { requester: jake._id, recipient: mike._id, status: 'accepted' },
    { requester: jake._id, recipient: sarah._id, status: 'accepted' },
    { requester: jake._id, recipient: tyler._id, status: 'accepted' },
    { requester: jake._id, recipient: coachRod._id, status: 'accepted' },
    { requester: mike._id, recipient: sarah._id, status: 'accepted' },
    { requester: mike._id, recipient: david._id, status: 'accepted' },
    { requester: sarah._id, recipient: david._id, status: 'accepted' },
    { requester: tyler._id, recipient: mike._id, status: 'accepted' },
    { requester: tyler._id, recipient: coachMartinez._id, status: 'accepted' },
    { requester: coachRod._id, recipient: sarah._id, status: 'accepted' },
    // Pending requests
    { requester: emma._id, recipient: jake._id, status: 'pending' },
    { requester: david._id, recipient: coachRod._id, status: 'pending' },
  ]);
  console.log(`Created ${connections.length} connections`);

  // ── Sessions ───────────────────────────────────────────────────────────────
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const lastWeek = new Date(now);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const sessions = await Session.insertMany([
    // Open (available) sessions
    {
      postedBy: jake._id,
      sport: 'Baseball',
      position: 'Pitcher (RHP)',
      posterRole: 'Pitcher',
      partnerRole: 'Catcher',
      title: 'Bullpen session — fastball command work',
      date: tomorrow.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      time: '6:00 PM',
      duration: '90 min',
      location: 'Mission Valley Sports Complex',
      goals: 'Working on 4-seam command down and away to RHH. 60-80 pitches.',
      skillLevelRequired: 'NCAA D1',
      equipment: ['catcher gear required'],
      status: 'open',
    },
    {
      postedBy: sarah._id,
      sport: 'Softball',
      position: 'Pitcher (RHP)',
      posterRole: 'Pitcher',
      partnerRole: 'Catcher',
      title: 'Softball bullpen — rise ball focus',
      date: nextWeek.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      time: '3:30 PM',
      duration: '60 min',
      location: 'Chula Vista Olympic Training Center',
      goals: 'Dialing in rise ball location at the letters. Also working on drop-change timing.',
      skillLevelRequired: 'NCAA D1',
      equipment: ['softball catcher gear', '12" softballs'],
      status: 'open',
    },
    {
      postedBy: tyler._id,
      sport: 'Baseball',
      position: 'Pitcher (LHP)',
      posterRole: 'Pitcher',
      partnerRole: 'Catcher',
      title: 'LHP live AB session — need experienced catcher',
      date: nextWeek.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      time: '5:00 PM',
      duration: '2 hours',
      location: 'Downtown Baseball Academy',
      goals: 'Live AB work vs RHH. Curveball, change, and 4-seam. Film available.',
      skillLevelRequired: 'NCAA D2',
      status: 'open',
    },
    // Confirmed sessions
    {
      postedBy: jake._id,
      sport: 'Baseball',
      position: 'Pitcher (RHP)',
      posterRole: 'Pitcher',
      partnerRole: 'Catcher',
      title: 'Bullpen — slider refinement',
      date: 'Today',
      time: '4:00 PM',
      duration: '75 min',
      location: 'Mission Valley Sports Complex',
      goals: 'Slider shape and depth. Working with Coach Rodriguez feedback from last session.',
      skillLevelRequired: 'NCAA D1',
      status: 'confirmed',
      partner: mike._id,
    },
    {
      postedBy: mike._id,
      sport: 'Baseball',
      position: 'Catcher',
      posterRole: 'Catcher',
      partnerRole: 'Pitcher',
      title: 'Catching session — blocking and framing',
      date: tomorrow.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      time: '10:00 AM',
      duration: '60 min',
      location: 'Sunset Field',
      goals: 'Blocking drills, pitch framing at corners, working with lefties.',
      skillLevelRequired: 'NCAA D2',
      status: 'confirmed',
      partner: david._id,
    },
    // Completed sessions
    {
      postedBy: jake._id,
      sport: 'Baseball',
      position: 'Pitcher (RHP)',
      posterRole: 'Pitcher',
      partnerRole: 'Catcher',
      title: 'Velocity program — day 3 bullpen',
      date: lastWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
      time: '5:30 PM',
      duration: '75 min',
      location: 'Mission Valley Sports Complex',
      goals: 'Velocity testing + flat ground work.',
      skillLevelRequired: 'NCAA D1',
      status: 'completed',
      partner: mike._id,
    },
    {
      postedBy: sarah._id,
      sport: 'Softball',
      position: 'Pitcher (RHP)',
      posterRole: 'Pitcher',
      partnerRole: 'Catcher',
      title: 'Full arsenal bullpen session',
      date: yesterday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
      time: '2:00 PM',
      duration: '90 min',
      location: 'USD Softball Complex',
      goals: 'All 5 pitches, zone control focus.',
      skillLevelRequired: 'NCAA D1',
      status: 'completed',
      partner: david._id,
    },
  ]);
  console.log(`Created ${sessions.length} sessions`);

  const [openJake, openSarah, openTyler, confirmedJake, confirmedMike, completedJake, completedSarah] = sessions;

  // ── Messages ────────────────────────────────────────────────────────────────
  const msgs = (sender, recipient, pairs) =>
    pairs.map(([text, minutesAgo]) => ({
      sender: sender._id,
      recipient: recipient._id,
      text,
      read: true,
      createdAt: new Date(Date.now() - minutesAgo * 60000),
    }));

  await Message.insertMany([
    // Jake ↔ Mike conversation
    ...msgs(mike, jake, [
      ["Hey! I saw your bullpen request for tonight", 90],
    ]),
    ...msgs(jake, mike, [
      ["Hi! Yes, still looking for a catcher. Are you available?", 88],
    ]),
    ...msgs(mike, jake, [
      ["Yeah, I can make it. What time exactly?", 87],
    ]),
    ...msgs(jake, mike, [
      ["6:00 PM at Mission Valley Sports Complex. Should take about 90 minutes", 85],
    ]),
    ...msgs(mike, jake, [
      ["Perfect! I know that field well. See you there", 83],
      ["Thanks! See you at 6PM 🤙", 82],
    ]),
    // Jake ↔ Sarah conversation
    ...msgs(sarah, jake, [
      ["Hey Jake! Heard you're working with Coach Rodriguez now", 240],
    ]),
    ...msgs(jake, sarah, [
      ["Yeah! Week 3 of his program. Sitting 91-93 consistently now", 235],
    ]),
    ...msgs(sarah, jake, [
      ["That's huge progress. He's the best in SD", 230],
    ]),
    ...msgs(jake, sarah, [
      ["100%. Are you still working with him too?", 228],
    ]),
    ...msgs(sarah, jake, [
      ["Yeah, doing a session Thursday. Let me know if you want to come watch", 225],
    ]),
    // Tyler ↔ Mike conversation
    ...msgs(tyler, mike, [
      ["Mike, you available to catch my live AB session next week?", 300],
    ]),
    ...msgs(mike, tyler, [
      ["What day are you thinking?", 295],
    ]),
    ...msgs(tyler, mike, [
      ["I posted it on the app — Friday 5PM at Downtown Baseball Academy", 290],
    ]),
    ...msgs(mike, tyler, [
      ["Let me check my schedule... I should be able to make it!", 285],
    ]),
    // Jake ↔ Coach Rodriguez
    ...msgs(coachRod, jake, [
      ["Jake — great progress on the slider shape today. Keep working the hip drive through release.", 60],
    ]),
    ...msgs(jake, coachRod, [
      ["Thanks Coach! I really felt the difference when I stayed tall. Same time Thursday?", 55],
    ]),
    ...msgs(coachRod, jake, [
      ["Thursday works. Also watch the TrackMan video I sent — your spin axis is off by about 3 degrees.", 50],
    ]),
    ...msgs(jake, coachRod, [
      ["On it. Will study it tonight", 45],
    ]),
  ]);
  console.log('Created messages');

  // ── Ratings ────────────────────────────────────────────────────────────────
  const ratings = await Rating.insertMany([
    {
      rater: mike._id,
      ratee: jake._id,
      session: completedJake._id,
      overallRating: 5,
      categories: { skillLevel: 5, punctuality: 5, communication: 4, attitude: 5 },
      wouldTrainAgain: true,
      feedback: 'Jake is extremely focused and works on specific goals each session. Highly recommend.',
      sport: 'Baseball',
    },
    {
      rater: jake._id,
      ratee: mike._id,
      session: completedJake._id,
      overallRating: 5,
      categories: { skillLevel: 5, punctuality: 5, communication: 5, attitude: 5 },
      wouldTrainAgain: true,
      feedback: 'Mike has elite framing skills and called a great game. Gave me instant feedback every pitch.',
      sport: 'Baseball',
    },
    {
      rater: david._id,
      ratee: sarah._id,
      session: completedSarah._id,
      overallRating: 5,
      categories: { skillLevel: 5, punctuality: 4, communication: 5, attitude: 5 },
      wouldTrainAgain: true,
      feedback: 'Catching for Sarah is a masterclass in pitching variety. She hits her spots and coached me on my receiving too.',
      sport: 'Softball',
    },
    {
      rater: sarah._id,
      ratee: david._id,
      session: completedSarah._id,
      overallRating: 4,
      categories: { skillLevel: 4, punctuality: 5, communication: 4, attitude: 5 },
      wouldTrainAgain: true,
      feedback: 'Great effort and super coachable. A couple of blocking reps to clean up but very solid overall.',
      sport: 'Softball',
    },
    {
      rater: jake._id,
      ratee: coachRod._id,
      session: null,
      overallRating: 5,
      categories: { skillLevel: 5, punctuality: 5, communication: 5, attitude: 5 },
      wouldTrainAgain: true,
      feedback: 'Best pitching coach I\'ve worked with. Data-driven and results-oriented. Saw 3 mph velocity gain in 3 weeks.',
      sport: 'Baseball',
    },
  ]);
  console.log(`Created ${ratings.length} ratings`);

  // ── Posts ──────────────────────────────────────────────────────────────────
  await Post.insertMany([
    {
      author: jake._id,
      type: 'session_completion',
      content:
        'Huge bullpen today 🔥 First time hitting 93 consistently. The hip drive cue from Coach Rod is clicking. 72 pitches, 84% strikes. Slider is starting to have some real bite at the bottom of the zone. Grind continues.',
      sport: 'Baseball',
      session: completedJake._id,
      sessionPartner: mike._id,
      sessionSummary: '72 pitches · 84% strikes · topped out at 93 mph',
      likes: [mike._id, sarah._id, coachRod._id],
      comments: [
        {
          author: coachRod._id,
          text: "That hip drive is the key. Stay on it every rep and it'll become automatic. 95 is coming.",
        },
        {
          author: mike._id,
          text: 'Felt that slider too man. Late break down and away was filthy.',
        },
      ],
    },
    {
      author: sarah._id,
      type: 'session_completion',
      content:
        'Full 5-pitch arsenal bullpen session ✅ Spent extra time on screwball finish — it\'s finally starting to feel natural. Total 90 pitches, all 5 pitches getting to the zone.',
      sport: 'Softball',
      session: completedSarah._id,
      sessionPartner: david._id,
      sessionSummary: '90 pitches · 5-pitch arsenal · rise ball at 78%',
      likes: [jake._id, david._id, coachRod._id, tyler._id],
      comments: [
        {
          author: david._id,
          text: 'That rise ball at the letters was unfair. Batters have no chance.',
        },
      ],
    },
    {
      author: coachRod._id,
      type: 'thought',
      content:
        "Hot take: Catchers don't get enough credit for making pitchers better. A good receiver that gives honest feedback after every pitch is worth more than a radar gun. Next time you post a bullpen session, remember — your catcher is your most important tool.",
      sport: 'Baseball',
      likes: [jake._id, mike._id, sarah._id, david._id, tyler._id],
      comments: [
        { author: jake._id, text: 'Mike literally called my pitches better than I did last week. 100% agree.' },
        { author: mike._id, text: 'Appreciate this Coach. Catchers run the game 🤝' },
      ],
    },
    {
      author: tyler._id,
      type: 'thought',
      content:
        "LHPs — stop trying to copy RHP mechanics. Your natural crossfire and arm angle is an ADVANTAGE. Lean into it. Posted a new live AB session for Friday. Need an experienced catcher who has caught lefties before.",
      sport: 'Baseball',
      likes: [jake._id, coachMartinez._id],
    },
  ]);
  console.log('Created posts');

  console.log('\n✅ Seed complete!');
  console.log('\n🔐 Test credentials (all use password: Password1!)');
  console.log('  Athlete (Pitcher): jake@example.com');
  console.log('  Athlete (Catcher): mike@example.com');
  console.log('  Athlete (Softball P): sarah@example.com');
  console.log('  Athlete (Catcher): david@example.com');
  console.log('  Athlete (Basketball): emma@example.com');
  console.log('  Athlete (LHP): tyler@example.com');
  console.log('  Coach: coach.rod@example.com');
  console.log('  Coach: coach.martinez@example.com');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
