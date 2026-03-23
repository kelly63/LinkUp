const request = require('supertest');
const { app } = require('../src/app');
const { register } = require('./helpers/auth');

describe('Session Routes', () => {
  let userA, userB;

  beforeEach(async () => {
    userA = await register({ email: 'sessionA@example.com' });
    userB = await register({ email: 'sessionB@example.com' });
  });

  const createSession = async (token, overrides = {}) =>
    request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ sport: 'Basketball', date: '2026-06-01', ...overrides });

  describe('POST /api/sessions', () => {
    it('creates a session', async () => {
      const res = await createSession(userA.token);
      expect(res.status).toBe(201);
      expect(res.body.session.sport).toBe('Basketball');
      expect(res.body.session.status).toBe('open');
    });

    it('returns 400 when sport or date missing', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ sport: 'Basketball' });
      expect(res.status).toBe(400);
    });

    it('requires authentication', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .send({ sport: 'Basketball', date: '2026-06-01' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/sessions/available', () => {
    it('returns open sessions not posted by current user', async () => {
      await createSession(userA.token);

      const res = await request(app)
        .get('/api/sessions/available')
        .set('Authorization', `Bearer ${userB.token}`);
      expect(res.status).toBe(200);
      expect(res.body.sessions.length).toBeGreaterThan(0);
    });

    it('excludes sessions posted by current user', async () => {
      await createSession(userA.token);

      const res = await request(app)
        .get('/api/sessions/available')
        .set('Authorization', `Bearer ${userA.token}`);
      expect(res.status).toBe(200);
      expect(res.body.sessions).toHaveLength(0);
    });
  });

  describe('GET /api/sessions/my', () => {
    it('returns sessions posted by current user', async () => {
      await createSession(userA.token);

      const res = await request(app)
        .get('/api/sessions/my')
        .set('Authorization', `Bearer ${userA.token}`);
      expect(res.status).toBe(200);
      expect(res.body.sessions).toHaveLength(1);
    });

    it('returns empty when user has no sessions', async () => {
      const res = await request(app)
        .get('/api/sessions/my')
        .set('Authorization', `Bearer ${userB.token}`);
      expect(res.status).toBe(200);
      expect(res.body.sessions).toHaveLength(0);
    });
  });

  describe('GET /api/sessions/:id', () => {
    it('returns session by id', async () => {
      const created = await createSession(userA.token);
      const sessionId = created.body.session._id;

      const res = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${userA.token}`);
      expect(res.status).toBe(200);
      expect(res.body.session._id).toBe(sessionId);
    });

    it('returns 404 for non-existent session', async () => {
      const res = await request(app)
        .get('/api/sessions/000000000000000000000000')
        .set('Authorization', `Bearer ${userA.token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/sessions/:id', () => {
    it('updates session details', async () => {
      const created = await createSession(userA.token);
      const sessionId = created.body.session._id;

      const res = await request(app)
        .put(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ location: 'Main Gym' });
      expect(res.status).toBe(200);
      expect(res.body.session.location).toBe('Main Gym');
    });

    it('returns 403 when non-owner tries to update', async () => {
      const created = await createSession(userA.token);
      const sessionId = created.body.session._id;

      const res = await request(app)
        .put(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ location: 'Elsewhere' });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/sessions/:id', () => {
    it('cancels own session', async () => {
      const created = await createSession(userA.token);
      const sessionId = created.body.session._id;

      const res = await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${userA.token}`);
      expect(res.status).toBe(200);
      expect(res.body.session.status).toBe('cancelled');
    });

    it('returns 403 when non-owner tries to cancel', async () => {
      const created = await createSession(userA.token);
      const sessionId = created.body.session._id;

      const res = await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${userB.token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/sessions/:id/accept', () => {
    it('accepts an open session', async () => {
      const created = await createSession(userA.token);
      const sessionId = created.body.session._id;

      const res = await request(app)
        .post(`/api/sessions/${sessionId}/accept`)
        .set('Authorization', `Bearer ${userB.token}`);
      expect(res.status).toBe(200);
      expect(res.body.session.status).toBe('confirmed');
    });

    it('returns 400 when owner tries to accept own session', async () => {
      const created = await createSession(userA.token);
      const sessionId = created.body.session._id;

      const res = await request(app)
        .post(`/api/sessions/${sessionId}/accept`)
        .set('Authorization', `Bearer ${userA.token}`);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/sessions/:id/complete', () => {
    it('marks a confirmed session as completed', async () => {
      const created = await createSession(userA.token);
      const sessionId = created.body.session._id;

      await request(app)
        .post(`/api/sessions/${sessionId}/accept`)
        .set('Authorization', `Bearer ${userB.token}`);

      const res = await request(app)
        .post(`/api/sessions/${sessionId}/complete`)
        .set('Authorization', `Bearer ${userA.token}`);
      expect(res.status).toBe(200);
      expect(res.body.session.status).toBe('completed');
    });

    it('returns 400 when session is not confirmed', async () => {
      const created = await createSession(userA.token);
      const sessionId = created.body.session._id;

      const res = await request(app)
        .post(`/api/sessions/${sessionId}/complete`)
        .set('Authorization', `Bearer ${userA.token}`);
      expect(res.status).toBe(400);
    });
  });
});
