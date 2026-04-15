import multer from 'multer';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const uploadSingleImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
  },
});

export const allowedImageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
