import { Router } from 'express';
import {
  getAvailability,
  createAppointment,
} from '../controllers/appointment.controller';
import {
  appointmentValidators,
  queryValidators,
} from '../middlewares/validators';
import { validate } from '../middlewares/validate';

const router = Router();

/**
 * @swagger
 * /api/appointments/availability:
 *   get:
 *     summary: Get doctor availability (dates or time slots)
 *     description: |
 *       Returns availability data based on query parameters:
 *       - **Only `doctorId`** → Returns the next 30 days where the doctor has working hours
 *       - **`doctorId` + `date`** → Returns unbooked 30-minute time slots for that specific date
 *     tags: [Appointments (Public)]
 *     parameters:
 *       - in: query
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *         description: The doctor's MongoDB ID
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check time slots for (YYYY-MM-DD). If omitted, returns available dates instead.
 *         example: "2026-04-15"
 *     responses:
 *       200:
 *         description: |
 *           - Without `date`: Array of available dates (e.g. `["2026-04-14", "2026-04-15"]`)
 *           - With `date`: Array of available time slots (e.g. `["09:00", "09:30", "10:00"]`)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: Doctor not found
 */
router.get(
  '/availability',
  queryValidators.availability,
  validate,
  getAvailability
);

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Book a new appointment
 *     description: Creates a new appointment after validating doctor availability, working hours, and preventing double-booking
 *     tags: [Appointments (Public)]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - doctorId
 *               - fullName
 *               - age
 *               - phoneNumber
 *               - selectedDate
 *               - selectedTime
 *             properties:
 *               doctorId:
 *                 type: string
 *                 example: "661f1a2b3c4d5e6f7a8b9c0d"
 *               fullName:
 *                 type: string
 *                 example: "Aziz Rahmatullayev"
 *               age:
 *                 type: number
 *                 example: 28
 *               phoneNumber:
 *                 type: string
 *                 example: "+998901234567"
 *               selectedDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-04-15"
 *               selectedTime:
 *                 type: string
 *                 example: "10:00"
 *     responses:
 *       201:
 *         description: Appointment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validation error or scheduling conflict
 *       404:
 *         description: Doctor not found
 *       409:
 *         description: Time slot already booked
 */
router.post('/', appointmentValidators.create, validate, createAppointment);

export default router;
