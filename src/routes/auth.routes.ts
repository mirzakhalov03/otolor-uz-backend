import { Router } from 'express';
import { login, me } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth';
import { authValidators } from '../middlewares/validators';
import { validate } from '../middlewares/validate';

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Admin login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: otoloruzadmin }
 *               password: { type: string, example: your-password }
 *     responses:
 *       200: { description: Returns a JWT access token }
 *       401: { description: Invalid credentials }
 */
router.post('/login', authValidators.login, validate, login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get the authenticated principal
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Token is valid }
 *       401: { description: Missing or invalid token }
 */
router.get('/me', requireAuth, me);

export default router;
