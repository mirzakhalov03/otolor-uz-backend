import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Otolor Appointment Management API',
      version: '1.0.0',
      description:
        'A production-ready REST API for managing doctor appointments. Supports public booking, admin management, and doctor schedule configuration.',
      contact: {
        name: 'Otolor Team',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.port}`,
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Uploads',
        description: 'File upload endpoints',
      },
      {
        name: 'Categories',
        description: 'Service category management',
      },
      {
        name: 'Services',
        description: 'Service CRUD endpoints',
      },
      {
        name: 'Doctors',
        description: 'Doctor management and availability',
      },
      {
        name: 'Appointments (Public)',
        description: 'Public appointment booking endpoints',
      },
      {
        name: 'Appointments (Admin)',
        description: 'Admin appointment management endpoints',
      },
    ],
    components: {
      schemas: {
        Category: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '661f1a2b3c4d5e6f7a8b9c0d' },
            name: { type: 'string', example: 'Surgery' },
            slug: { type: 'string', example: 'surgery' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Service: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '661f1a2b3c4d5e6f7a8b9c0d' },
            title: { type: 'string', example: 'Teeth Whitening' },
            description: {
              type: 'string',
              example: 'Professional in-clinic whitening procedure',
            },
            price: { type: 'number', example: 120 },
            category: { $ref: '#/components/schemas/Category' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Doctor: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '661f1a2b3c4d5e6f7a8b9c0d' },
            name: { type: 'string', example: 'Dr. Sardor Karimov' },
            specialization: { type: 'string', example: 'Stomatolog' },
            avatarUrl: {
              type: 'string',
              example: 'https://your-bucket.s3.your-region.amazonaws.com/doctors/avatars/doctor.jpg',
            },
            weeklySchedule: {
              type: 'object',
              properties: {
                Monday: { type: 'string', example: '09:00-16:00' },
                Tuesday: { type: 'string', example: '09:00-17:00' },
                Wednesday: { type: 'string', example: '09:00-16:00' },
                Thursday: { type: 'string', example: '09:00-14:00' },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Appointment: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '661f1a2b3c4d5e6f7a8b9c0d' },
            doctorId: { type: 'string', example: '661f1a2b3c4d5e6f7a8b9c0d' },
            fullName: { type: 'string', example: 'Aziz Rahmatullayev' },
            age: { type: 'number', example: 28 },
            phoneNumber: { type: 'string', example: '+998901234567' },
            preferredDate: { type: 'string', format: 'date', example: '2026-04-15' },
            preferredTime: { type: 'string', example: '10:00' },
            orderNumber: { type: 'string', example: 'A101' },
            status: {
              type: 'string',
              enum: ['pending', 'seen', 'missed'],
              example: 'pending',
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: {} },
            message: { type: 'string' },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                page: { type: 'number' },
                limit: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
