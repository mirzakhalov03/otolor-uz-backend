import { Router } from 'express';
import {
  getAppointments,
  updateAppointmentStatus,
  deleteAppointment,
} from '../controllers/appointment.controller';
import { appointmentValidators } from '../middlewares/validators';
import { validate } from '../middlewares/validate';

const router = Router();

/**
 * @swagger
 * /api/admin/appointments:
 *   get:
 *     summary: Get all appointments (Admin)
 *     description: Retrieve appointments with filtering, search, and pagination support
 *     tags: [Appointments (Admin)]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by date (YYYY-MM-DD)
 *         example: "2026-04-15"
 *       - in: query
 *         name: doctorId
 *         schema:
 *           type: string
 *         description: Filter by doctor ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, seen, missed]
 *         description: Filter by appointment status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by patient name, phone number, or order number
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Paginated list of appointments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get('/', getAppointments);

/**
 * @swagger
 * /api/admin/appointments/{id}/status:
 *   patch:
 *     summary: Update appointment status (Admin)
 *     description: Update a pending appointment's status to "seen" or "missed"
 *     tags: [Appointments (Admin)]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [seen, missed]
 *                 example: "seen"
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status transition
 *       404:
 *         description: Appointment not found
 */
router.patch(
  '/:id/status',
  appointmentValidators.updateStatus,
  validate,
  updateAppointmentStatus
);

/**
 * @swagger
 * /api/admin/appointments/{id}:
 *   delete:
 *     summary: Delete an appointment (Admin)
 *     tags: [Appointments (Admin)]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Appointment deleted successfully
 *       404:
 *         description: Appointment not found
 */
router.delete(
  '/:id',
  appointmentValidators.delete,
  validate,
  deleteAppointment
);

export default router;
