const request = require('supertest');
const { app } = require('../src/app');
const { register } = require('./helpers/auth');

describe('User Routes', () => {
  let token, userId;

  beforeEach(async () => {
    const result = await register();
    token = result.token;
    userId = result.user._id;
  });

  describe('GET /api/users', () => {
    it('returns users list', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.users).toBeDefined();
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    it('requires authentication', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });

    it('excludes current user from results', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const ids = res.body.users.map((u) => u._id);
      expect(ids).not.toContain(userId);
    });
  });

  describe('GET /api/users/:id', () => {
    it('returns user by id', async () => {
      const res = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.user._id).toBe(userId);
    });

    it('returns 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/api/users/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it('requires authentication', async () => {
      const res = await request(app).get(`/api/users/${userId}`);
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('updates profile fields', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ bio: 'Test bio', location: 'New York' });
      expect(res.status).toBe(200);
      expect(res.body.user.bio).toBe('Test bio');
      expect(res.body.user.location).toBe('New York');
    });

    it('requires authentication', async () => {
      const res = await request(app).put('/api/users/profile').send({ bio: 'Test' });
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/users/password', () => {
    it('changes password with correct current password', async () => {
      const { token: t, credentials } = await register({ email: 'pwchange@example.com' });
      const res = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${t}`)
        .send({ currentPassword: credentials.password, newPassword: 'newpassword456' });
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/password updated/i);
    });

    it('returns 401 for wrong current password', async () => {
      const res = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'wrongpassword', newPassword: 'newpassword456' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when fields missing', async () => {
      const res = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'password123' });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/users/role', () => {
    it('updates role to coach', async () => {
      const res = await request(app)
        .put('/api/users/role')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'coach' });
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('coach');
    });

    it('returns 400 for invalid role', async () => {
      const res = await request(app)
        .put('/api/users/role')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' });
      expect(res.status).toBe(400);
    });
  });
});
