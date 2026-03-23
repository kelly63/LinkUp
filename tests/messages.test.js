const request = require('supertest');
const { app } = require('../src/app');
const { register } = require('./helpers/auth');

describe('Message Routes', () => {
  let userA, userB;

  beforeEach(async () => {
    userA = await register({ email: 'msgA@example.com' });
    userB = await register({ email: 'msgB@example.com' });
  });

  const connectUsers = async (a, b) => {
    const req = await request(app)
      .post(`/api/connections/request/${b.user._id}`)
      .set('Authorization', `Bearer ${a.token}`);
    await request(app)
      .put(`/api/connections/${req.body.connection._id}/accept`)
      .set('Authorization', `Bearer ${b.token}`);
  };

  describe('POST /api/messages/:userId', () => {
    it('sends a message between connected users', async () => {
      await connectUsers(userA, userB);

      const res = await request(app)
        .post(`/api/messages/${userB.user._id}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ text: 'Hey there!' });
      expect(res.status).toBe(201);
      expect(res.body.message.text).toBe('Hey there!');
    });

    it('returns 403 when users are not connected', async () => {
      const res = await request(app)
        .post(`/api/messages/${userB.user._id}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ text: 'Hello' });
      expect(res.status).toBe(403);
    });

    it('returns 400 when message text is empty', async () => {
      await connectUsers(userA, userB);

      const res = await request(app)
        .post(`/api/messages/${userB.user._id}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ text: '' });
      expect(res.status).toBe(400);
    });

    it('requires authentication', async () => {
      const res = await request(app)
        .post(`/api/messages/${userB.user._id}`)
        .send({ text: 'Hi' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/messages/:userId', () => {
    it('returns conversation between connected users', async () => {
      await connectUsers(userA, userB);
      await request(app)
        .post(`/api/messages/${userB.user._id}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ text: 'First message' });

      const res = await request(app)
        .get(`/api/messages/${userB.user._id}`)
        .set('Authorization', `Bearer ${userA.token}`);
      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(1);
      expect(res.body.messages[0].text).toBe('First message');
    });

    it('returns 403 when users are not connected', async () => {
      const res = await request(app)
        .get(`/api/messages/${userB.user._id}`)
        .set('Authorization', `Bearer ${userA.token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/messages', () => {
    it('returns inbox conversations', async () => {
      await connectUsers(userA, userB);
      await request(app)
        .post(`/api/messages/${userB.user._id}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ text: 'Inbox test' });

      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${userA.token}`);
      expect(res.status).toBe(200);
      expect(res.body.conversations).toBeDefined();
      expect(Array.isArray(res.body.conversations)).toBe(true);
    });

    it('requires authentication', async () => {
      const res = await request(app).get('/api/messages');
      expect(res.status).toBe(401);
    });
  });
});
