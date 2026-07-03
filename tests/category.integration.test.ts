import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Express } from 'express';

describe('Category update + delete', () => {
  let mongoServer: MongoMemoryServer;
  let app: Express;
  let token: string;

  const auth = () => ({ Authorization: `Bearer ${token}` });

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

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'pw' });
    token = login.body.data.token;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  const createCategory = () =>
    request(app).post('/api/categories').set(auth()).send({ name: 'Surgery' });

  it('updates a category (200)', async () => {
    const { body } = await createCategory();
    const id = body.data._id;

    const res = await request(app)
      .patch(`/api/categories/${id}`)
      .set(auth())
      .send({ name: 'Cardiology', slug: 'cardiology' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Cardiology');
    expect(res.body.data.slug).toBe('cardiology');
  });

  it('deletes an unreferenced category (200)', async () => {
    const { body } = await createCategory();

    const res = await request(app)
      .delete(`/api/categories/${body.data._id}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('refuses to delete a category referenced by a service (409)', async () => {
    const { body } = await createCategory();
    const categoryId = body.data._id;

    await request(app)
      .post('/api/services')
      .set(auth())
      .send({ title: 'Consultation', category: categoryId });

    const res = await request(app)
      .delete(`/api/categories/${categoryId}`)
      .set(auth());

    expect(res.status).toBe(409);
  });

  it('returns 404 when updating or deleting a non-existent id', async () => {
    const ghostId = new mongoose.Types.ObjectId().toString();

    const update = await request(app)
      .patch(`/api/categories/${ghostId}`)
      .set(auth())
      .send({ name: 'Nope' });
    expect(update.status).toBe(404);

    const del = await request(app)
      .delete(`/api/categories/${ghostId}`)
      .set(auth());
    expect(del.status).toBe(404);
  });

  it('rejects a malformed id with 400', async () => {
    const res = await request(app)
      .delete('/api/categories/not-a-valid-id')
      .set(auth());
    expect(res.status).toBe(400);
  });
});
