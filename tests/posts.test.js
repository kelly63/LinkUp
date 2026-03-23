const request = require('supertest');
const { app } = require('../src/app');
const { register } = require('./helpers/auth');

describe('Post Routes', () => {
  let token;

  beforeEach(async () => {
    const result = await register();
    token = result.token;
  });

  describe('POST /api/posts', () => {
    it('creates a post', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'thought', content: 'Hello world' });
      expect(res.status).toBe(201);
      expect(res.body.post.content).toBe('Hello world');
      expect(res.body.post.author).toBeDefined();
    });

    it('requires authentication', async () => {
      const res = await request(app)
        .post('/api/posts')
        .send({ content: 'Hello' });
      expect(res.status).toBe(401);
    });

    it('defaults type to thought', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'No type given' });
      expect(res.status).toBe(201);
      expect(res.body.post.type).toBe('thought');
    });
  });

  describe('GET /api/posts', () => {
    it('returns feed', async () => {
      await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'My post' });

      const res = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.posts).toBeDefined();
      expect(Array.isArray(res.body.posts)).toBe(true);
    });

    it('requires authentication', async () => {
      const res = await request(app).get('/api/posts');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/posts/:id/like', () => {
    it('toggles like on a post', async () => {
      const created = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Likeable post' });
      const postId = created.body.post._id;

      const res = await request(app)
        .post(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(true);
      expect(res.body.likes).toBe(1);
    });

    it('unlikes when liked again', async () => {
      const created = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Toggle post' });
      const postId = created.body.post._id;

      await request(app)
        .post(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${token}`);
      const res = await request(app)
        .post(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(false);
      expect(res.body.likes).toBe(0);
    });

    it('returns 404 for non-existent post', async () => {
      const res = await request(app)
        .post('/api/posts/000000000000000000000000/like')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/posts/:id/comment', () => {
    it('adds a comment to a post', async () => {
      const created = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Commentable post' });
      const postId = created.body.post._id;

      const res = await request(app)
        .post(`/api/posts/${postId}/comment`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Great post!' });
      expect(res.status).toBe(201);
      expect(res.body.comment.text).toBe('Great post!');
    });

    it('returns 400 when comment text is empty', async () => {
      const created = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Post' });
      const postId = created.body.post._id;

      const res = await request(app)
        .post(`/api/posts/${postId}/comment`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('deletes own post', async () => {
      const created = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Delete me' });
      const postId = created.body.post._id;

      const res = await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
    });

    it('returns 403 when deleting another user post', async () => {
      const other = await register({ email: 'other@example.com' });
      const created = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${other.token}`)
        .send({ content: 'Not yours' });
      const postId = created.body.post._id;

      const res = await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent post', async () => {
      const res = await request(app)
        .delete('/api/posts/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
