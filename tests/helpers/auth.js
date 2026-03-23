const request = require('supertest');
const { app } = require('../../src/app');

let counter = 0;

async function register(overrides = {}) {
  counter += 1;
  const defaults = {
    name: `Test User ${counter}`,
    email: `testuser${counter}@example.com`,
    password: 'password123',
  };
  const body = { ...defaults, ...overrides };
  const res = await request(app).post('/api/auth/register').send(body);
  return { token: res.body.token, user: res.body.user, credentials: body };
}

module.exports = { register };
