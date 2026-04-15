import { Router } from 'express';
import { createCategory, getCategories } from '../controllers/category.controller';
import { categoryValidators } from '../middlewares/validators';
import { validate } from '../middlewares/validate';

const router = Router();

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a category
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Surgery"
 *               slug:
 *                 type: string
 *                 example: "surgery"
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Duplicate category name or slug
 */
router.post('/', categoryValidators.create, validate, createCategory);

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/', getCategories);

export default router;
