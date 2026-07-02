import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Express } from 'express';

describe('Smoke integration tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: Express;

  const getTomorrowDateString = (): string => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  };

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
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('health endpoint responds successfully', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Server is running');
  });

  it('booking flow works end-to-end (doctor -> availability -> booking)', async () => {
    const selectedDate = getTomorrowDateString();

    const createDoctorResponse = await request(app)
      .post('/api/doctors')
      .send({
        name: 'Dr. Smoke Test',
        specialization: 'General',
        weeklySchedule: {
          [selectedDate]: '09:00-12:00',
        },
      });

    expect(createDoctorResponse.status).toBe(201);
    const doctorId = createDoctorResponse.body?.data?._id;
    expect(doctorId).toBeTruthy();

    const availabilityDatesResponse = await request(app)
      .get('/api/appointments/availability')
      .query({ doctorId });

    expect(availabilityDatesResponse.status).toBe(200);
    expect(availabilityDatesResponse.body.data).toContain(selectedDate);

    const createAppointmentResponse = await request(app)
      .post('/api/appointments')
      .send({
        doctorId,
        fullName: 'Smoke Test Patient',
        age: 30,
        phoneNumber: '+998901112233',
        selectedDate,
        selectedTime: '09:30',
      });

    expect(createAppointmentResponse.status).toBe(201);
    expect(createAppointmentResponse.body.data.orderNumber).toMatch(/^A\d+$/);

    const availabilityTimesResponse = await request(app)
      .get('/api/appointments/availability')
      .query({ doctorId, date: selectedDate });

    expect(availabilityTimesResponse.status).toBe(200);
    expect(availabilityTimesResponse.body.data).not.toContain('09:30');
  });

  it('admin appointments endpoint is reachable without auth (current behavior)', async () => {
    const response = await request(app).get('/api/admin/appointments');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
