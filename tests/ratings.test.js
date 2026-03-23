const request = require('supertest');
const { app } = require('../src/app');
const { register } = require('./helpers/auth');

describe('Rating Routes', () => {
  let rater, ratee;

  beforeEach(async () => {
    rater = await register({ email: 'rater@example.com' });
    ratee = await register({ email: 'ratee@example.com' });
  });

  describe('POST /api/ratings', () => {
    it('submits a rating', async () => {
      const res = await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${rater.token}`)
        .send({ rateeId: ratee.user._id, overallRating: 4, sport: 'Basketball' });
      expect(res.status).toBe(201);
      expect(res.body.rating.overallRating).toBe(4);
    });

    it('returns 400 when rateeId or overallRating missing', async () => {
      const res = await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${rater.token}`)
        .send({ rateeId: ratee.user._id });
      expect(res.status).toBe(400);
    });

    it('returns 400 when rating yourself', async () => {
      const res = await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${rater.token}`)
        .send({ rateeId: rater.user._id, overallRating: 5 });
      expect(res.status).toBe(400);
    });

    it('returns 409 on duplicate rating for same session', async () => {
      const sessionId = '000000000000000000000001';
      await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${rater.token}`)
        .send({ rateeId: ratee.user._id, overallRating: 4, sessionId });
      const res = await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${rater.token}`)
        .send({ rateeId: ratee.user._id, overallRating: 5, sessionId });
      expect(res.status).toBe(409);
    });

    it('requires authentication', async () => {
      const res = await request(app)
        .post('/api/ratings')
        .send({ rateeId: ratee.user._id, overallRating: 4 });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/ratings/received', () => {
    it('returns ratings received by current user', async () => {
      await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${rater.token}`)
        .send({ rateeId: ratee.user._id, overallRating: 5 });

      const res = await request(app)
        .get('/api/ratings/received')
        .set('Authorization', `Bearer ${ratee.token}`);
      expect(res.status).toBe(200);
      expect(res.body.ratings).toHaveLength(1);
      expect(res.body.ratings[0].overallRating).toBe(5);
    });

    it('returns empty when no ratings received', async () => {
      const res = await request(app)
        .get('/api/ratings/received')
        .set('Authorization', `Bearer ${rater.token}`);
      expect(res.status).toBe(200);
      expect(res.body.ratings).toHaveLength(0);
    });
  });

  describe('GET /api/ratings/given', () => {
    it('returns ratings given by current user', async () => {
      await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${rater.token}`)
        .send({ rateeId: ratee.user._id, overallRating: 3 });

      const res = await request(app)
        .get('/api/ratings/given')
        .set('Authorization', `Bearer ${rater.token}`);
      expect(res.status).toBe(200);
      expect(res.body.ratings).toHaveLength(1);
    });
  });

  describe('GET /api/ratings/user/:userId', () => {
    it('returns approved ratings for a specific user', async () => {
      const res = await request(app)
        .get(`/api/ratings/user/${ratee.user._id}`)
        .set('Authorization', `Bearer ${rater.token}`);
      expect(res.status).toBe(200);
      expect(res.body.ratings).toBeDefined();
      expect(res.body.summary).toBeDefined();
    });
  });
});
