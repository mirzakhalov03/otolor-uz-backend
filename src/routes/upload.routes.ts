import { Router } from 'express';
import { uploadImage } from '../controllers/upload.controller';
import { uploadSingleImage } from '../middlewares/upload';
import { requireAuth } from '../middlewares/auth';

const router = Router();

/**
 * @swagger
 * /api/uploads/image:
 *   post:
 *     summary: Upload an image to S3 and get public URL
 *     tags: [Uploads]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid file or request
 *       500:
 *         description: S3 configuration/upload error
 */
router.post('/image', requireAuth, uploadSingleImage.single('file'), uploadImage);

export default router;
