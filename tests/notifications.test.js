const request = require('supertest');
const { app } = require('../src/app');
const { register } = require('./helpers/auth');

describe('Notification Routes', () => {
  let token;

  beforeEach(async () => {
    const result = await register();
    token = result.token;
  });

  describe('GET /api/notifications/vapid-key', () => {
    it('returns vapid public key (public endpoint)', async () => {
      const res = await request(app).get('/api/notifications/vapid-key');
      expect(res.status).toBe(200);
      expect(res.body.publicKey).toBeDefined();
    });
  });

  describe('GET /api/notifications', () => {
    it('returns notifications for current user', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.notifications).toBeDefined();
      expect(Array.isArray(res.body.notifications)).toBe(true);
    });

    it('requires authentication', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/notifications/read-all', () => {
    it('marks all notifications as read', async () => {
      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('requires authentication', async () => {
      const res = await request(app).patch('/api/notifications/read-all');
      expect(res.status).toBe(401);
    });
  });
});
