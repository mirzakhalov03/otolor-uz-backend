import { Router } from 'express';
import {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
} from '../controllers/service.controller';
import { serviceValidators } from '../middlewares/validators';
import { validate } from '../middlewares/validate';
import { requireAuth } from '../middlewares/auth';

const router = Router();

/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Create a service
 *     tags: [Services]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Teeth Whitening"
 *               description:
 *                 type: string
 *                 example: "Professional in-clinic whitening procedure"
 *               price:
 *                 type: number
 *                 example: 120
 *               category:
 *                 type: string
 *                 example: "661f1a2b3c4d5e6f7a8b9c0d"
 *     responses:
 *       201:
 *         description: Service created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validation error or invalid category
 */
router.post('/', requireAuth, serviceValidators.create, validate, createService);

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Get services (all or filtered by category)
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         required: false
 *         schema:
 *           type: string
 *         description: Category ObjectId. If omitted, all services are returned.
 *     responses:
 *       200:
 *         description: Services retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid categoryId format
 */
router.get('/', serviceValidators.list, validate, getServices);

/**
 * @swagger
 * /api/services/{id}:
 *   get:
 *     summary: Get a single service by ID
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Service not found
 */
router.get('/:id', serviceValidators.getById, validate, getServiceById);

/**
 * @swagger
 * /api/services/{id}:
 *   put:
 *     summary: Update a service
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Teeth Whitening Plus"
 *               description:
 *                 type: string
 *                 example: "Updated package with follow-up session"
 *               price:
 *                 type: number
 *                 example: 150
 *               category:
 *                 type: string
 *                 example: "661f1a2b3c4d5e6f7a8b9c0d"
 *     responses:
 *       200:
 *         description: Service updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validation error or invalid category
 *       404:
 *         description: Service not found
 */
router.put('/:id', requireAuth, serviceValidators.update, validate, updateService);

/**
 * @swagger
 * /api/services/{id}:
 *   delete:
 *     summary: Delete a service
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service deleted successfully
 *       404:
 *         description: Service not found
 */
router.delete('/:id', requireAuth, serviceValidators.delete, validate, deleteService);

export default router;
