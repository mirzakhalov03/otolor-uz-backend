import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Express } from 'express';

describe('Booking correctness', () => {
  let mongoServer: MongoMemoryServer;
  let app: Express;
  let token: string;

  const tomorrow = (): string => {
    // Clinic tz (UTC+5) date; UTC+1 day is safely within the 7-day window.
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d);
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.NODE_ENV = 'test';
    process.env.MONGO_URI = mongoServer.getUri();
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'pw';
    process.env.CLINIC_TIMEZONE = 'Asia/Tashkent';

    const { connectDatabase } = await import('../src/config/database');
    await connectDatabase();
    app = (await import('../src/app')).default;

    const login = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'pw' });
    token = login.body.data.token;
  });

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  const createDoctor = async (date: string) => {
    const res = await request(app)
      .post('/api/doctors')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dr. Grid', specialization: 'General', weeklySchedule: { [date]: '09:00-12:00' } });
    return res.body.data._id as string;
  };

  it('rejects an off-grid time (11:45) with 400', async () => {
    const date = tomorrow();
    const doctorId = await createDoctor(date);
    const res = await request(app).post('/api/appointments').send({
      doctorId, fullName: 'Off Grid', age: 30, phoneNumber: '+998901112233',
      selectedDate: date, selectedTime: '11:45',
    });
    expect(res.status).toBe(400);
  });

  it('does not reopen a missed slot and cannot rebook it', async () => {
    const date = tomorrow();
    const doctorId = await createDoctor(date);

    const booking = await request(app).post('/api/appointments').send({
      doctorId, fullName: 'First', age: 30, phoneNumber: '+998901112233',
      selectedDate: date, selectedTime: '09:30',
    });
    expect(booking.status).toBe(201);

    // Mark it missed.
    await request(app)
      .patch(`/api/admin/appointments/${booking.body.data._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'missed' });

    // Availability must NOT offer 09:30 anymore.
    const avail = await request(app).get('/api/appointments/availability').query({ doctorId, date });
    expect(avail.body.data).not.toContain('09:30');

    // Rebooking 09:30 must fail (409), not silently double-book.
    const rebook = await request(app).post('/api/appointments').send({
      doctorId, fullName: 'Second', age: 40, phoneNumber: '+998907776655',
      selectedDate: date, selectedTime: '09:30',
    });
    expect(rebook.status).toBe(409);
  });

  it('rejects booking a past date', async () => {
    const date = tomorrow();
    const doctorId = await createDoctor(date);
    const res = await request(app).post('/api/appointments').send({
      doctorId, fullName: 'Past', age: 30, phoneNumber: '+998901112233',
      selectedDate: '2000-01-01', selectedTime: '09:30',
    });
    expect(res.status).toBe(400);
  });
});
