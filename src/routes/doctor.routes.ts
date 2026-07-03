import { Router } from 'express';
import {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
} from '../controllers/doctor.controller';
import { doctorValidators } from '../middlewares/validators';
import { validate } from '../middlewares/validate';
import { requireAuth } from '../middlewares/auth';

const router = Router();

/**
 * @swagger
 * /api/doctors:
 *   post:
 *     summary: Create a new doctor
 *     tags: [Doctors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - weeklySchedule
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Dr. Sardor Karimov"
 *               specialization:
 *                 type: string
 *                 example: "Stomatolog"
 *               avatarUrl:
 *                 type: string
 *                 example: "https://your-bucket.s3.your-region.amazonaws.com/doctors/avatars/example.jpg"
 *               experience:
 *                 type: integer
 *                 example: 12
 *                 description: Years of experience (0–80), shown on public profile cards
 *               isFeatured:
 *                 type: boolean
 *                 example: true
 *                 description: Surface this doctor on the public About page / home carousel
 *               weeklySchedule:
 *                 type: object
 *                 example:
 *                   Monday: "09:00-16:00"
 *                   Tuesday: "09:00-17:00"
 *                   Wednesday: "09:00-16:00"
 *                   Thursday: "09:00-14:00"
 *     responses:
 *       201:
 *         description: Doctor created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validation error
 */
router.post('/', requireAuth, doctorValidators.create, validate, createDoctor);

/**
 * @swagger
 * /api/doctors:
 *   get:
 *     summary: Get all doctors
 *     tags: [Doctors]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by doctor name or specialization
 *     responses:
 *       200:
 *         description: List of doctors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/', getDoctors);

/**
 * @swagger
 * /api/doctors/{id}:
 *   get:
 *     summary: Get a doctor by ID
 *     tags: [Doctors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Doctor ID
 *     responses:
 *       200:
 *         description: Doctor details
 *       404:
 *         description: Doctor not found
 */
router.get('/:id', getDoctorById);

/**
 * @swagger
 * /api/doctors/{id}:
 *   patch:
 *     summary: Update a doctor's details
 *     description: Update name, specialization, and/or weekly schedule. All fields are optional — only provided fields are changed.
 *     tags: [Doctors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Doctor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Dr. Sardor Karimov"
 *               specialization:
 *                 type: string
 *                 example: "Ortodont"
 *               avatarUrl:
 *                 type: string
 *                 example: "https://your-bucket.s3.your-region.amazonaws.com/doctors/avatars/example.jpg"
 *               experience:
 *                 type: integer
 *                 example: 12
 *                 description: Years of experience (0–80)
 *               isFeatured:
 *                 type: boolean
 *                 example: true
 *               weeklySchedule:
 *                 type: object
 *                 example:
 *                   Monday: "09:00-18:00"
 *                   Tuesday: "09:00-17:00"
 *                   Friday: "10:00-15:00"
 *     responses:
 *       200:
 *         description: Doctor updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Doctor not found
 */
router.patch('/:id', requireAuth, doctorValidators.update, validate, updateDoctor);

/**
 * @swagger
 * /api/doctors/{id}:
 *   delete:
 *     summary: Delete a doctor
 *     description: Deletes a doctor. Fails if the doctor has pending appointments — cancel or complete them first.
 *     tags: [Doctors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Doctor ID
 *     responses:
 *       200:
 *         description: Doctor deleted successfully
 *       400:
 *         description: Doctor has pending appointments
 *       404:
 *         description: Doctor not found
 */
router.delete('/:id', requireAuth, doctorValidators.delete, validate, deleteDoctor);

export default router;
