import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Express } from 'express';

describe('Auth integration', () => {
  let mongoServer: MongoMemoryServer;
  let app: Express;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.NODE_ENV = 'test';
    process.env.MONGO_URI = mongoServer.getUri();
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'pw';

    const { connectDatabase } = await import('../src/config/database');
    await connectDatabase();
    const appModule = await import('../src/app');
    app = appModule.default;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('rejects bad credentials with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns a token for valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'pw' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });

  it('blocks /api/auth/me without a token and allows it with one', async () => {
    const noToken = await request(app).get('/api/auth/me');
    expect(noToken.status).toBe(401);

    const login = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'pw' });
    const withToken = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.data.token}`);
    expect(withToken.status).toBe(200);
    expect(withToken.body.data.role).toBe('admin');
  });
});
