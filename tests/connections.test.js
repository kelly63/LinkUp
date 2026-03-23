const request = require('supertest');
const { app } = require('../src/app');
const { register } = require('./helpers/auth');

describe('Connection Routes', () => {
  let userA, userB;

  beforeEach(async () => {
    userA = await register({ email: 'usera@example.com' });
    userB = await register({ email: 'userb@example.com' });
  });

  describe('POST /api/connections/request/:userId', () => {
    it('sends a connection request', async () => {
      const res = await request(app)
        .post(`/api/connections/request/${userB.user._id}`)
        .set('Authorization', `Bearer ${userA.token}`);
      expect(res.status).toBe(201);
      expect(res.body.connection.status).toBe('pending');
    });

    it('returns 400 when connecting with yourself', async () => {
      const res = await request(app)
        .post(`/api/connections/request/${userA.user._id}`)
        .set('Authorization', `Bearer ${userA.token}`);
      expect(res.status).toBe(400);
    });

    it('returns 409 when request already exists', async () => {
      await request(app)
        .post(`/api/connections/request/${userB.user._id}`)
        .set('Authorization', `Bearer ${userA.token}`);
      const res = await request(app)
        .post(`/api/connections/request/${userB.user._id}`)
        .set('Authorization', `Bearer ${userA.token}`);
      expect(res.status).toBe(409);
    });

    it('requires authentication', async () => {
      const res = await request(app).post(`/api/connections/request/${userB.user._id}`);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/connections/pending', () => {
    it('returns pending incoming requests', async () => {
      await request(app)
        .post(`/api/connections/request/${userB.user._id}`)
        .set('Authorization', `Bearer ${userA.token}`);

      const res = await request(app)
        .get('/api/connections/pending')
        .set('Authorization', `Bearer ${userB.token}`);
      expect(res.status).toBe(200);
      expect(res.body.requests).toHaveLength(1);
    });

    it('returns empty when no pending requests', async () => {
      const res = await request(app)
        .get('/api/connections/pending')
        .set('Authorization', `Bearer ${userA.token}`);
      expect(res.status).toBe(200);
      expect(res.body.requests).toHaveLength(0);
    });
  });

  describe('PUT /api/connections/:connectionId/accept', () => {
    it('accepts a pending request', async () => {
      const req = await request(app)
        .post(`/api/connections/request/${userB.user._id}`)
        .set('Authorization', `Bearer ${userA.token}`);
      const connectionId = req.body.connection._id;

      const res = await request(app)
        .put(`/api/connections/${connectionId}/accept`)
        .set('Authorization', `Bearer ${userB.token}`);
      expect(res.status).toBe(200);
      expect(res.body.connection.status).toBe('accepted');
    });

    it('returns 404 when connection not found', async () => {
      const res = await request(app)
        .put('/api/connections/000000000000000000000000/accept')
        .set('Authorization', `Bearer ${userB.token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/connections/:connectionId/reject', () => {
    it('rejects a pending request', async () => {
      const req = await request(app)
        .post(`/api/connections/request/${userB.user._id}`)
        .set('Authorization', `Bearer ${userA.token}`);
      const connectionId = req.body.connection._id;

      const res = await request(app)
        .put(`/api/connections/${connectionId}/reject`)
        .set('Authorization', `Bearer ${userB.token}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/rejected/i);
    });
  });

  describe('GET /api/connections', () => {
    it('returns accepted connections', async () => {
      const req = await request(app)
        .post(`/api/connections/request/${userB.user._id}`)
        .set('Authorization', `Bearer ${userA.token}`);
      await request(app)
        .put(`/api/connections/${req.body.connection._id}/accept`)
        .set('Authorization', `Bearer ${userB.token}`);

      const res = await request(app)
        .get('/api/connections')
        .set('Authorization', `Bearer ${userA.token}`);
      expect(res.status).toBe(200);
      expect(res.body.connections).toHaveLength(1);
    });
  });

  describe('GET /api/connections/status/:userId', () => {
    it('returns none when no connection exists', async () => {
      const res = await request(app)
        .get(`/api/connections/status/${userB.user._id}`)
        .set('Authorization', `Bearer ${userA.token}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('none');
    });

    it('returns pending status after request sent', async () => {
      await request(app)
        .post(`/api/connections/request/${userB.user._id}`)
        .set('Authorization', `Bearer ${userA.token}`);

      const res = await request(app)
        .get(`/api/connections/status/${userB.user._id}`)
        .set('Authorization', `Bearer ${userA.token}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('pending');
    });
  });

  describe('DELETE /api/connections/:connectionId', () => {
    it('removes an accepted connection', async () => {
      const req = await request(app)
        .post(`/api/connections/request/${userB.user._id}`)
        .set('Authorization', `Bearer ${userA.token}`);
      const connectionId = req.body.connection._id;
      await request(app)
        .put(`/api/connections/${connectionId}/accept`)
        .set('Authorization', `Bearer ${userB.token}`);

      const res = await request(app)
        .delete(`/api/connections/${connectionId}`)
        .set('Authorization', `Bearer ${userA.token}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/removed/i);
    });
  });
});
