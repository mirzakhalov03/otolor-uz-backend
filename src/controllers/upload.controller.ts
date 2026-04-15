import { Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { allowedImageMimeTypes } from '../middlewares/upload';
import { uploadService } from '../services/upload.service';
import { sendResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;

  if (!file) {
    throw new AppError('Image file is required. Use multipart/form-data with field name "file".', 400);
  }

  if (!allowedImageMimeTypes.has(file.mimetype)) {
    throw new AppError('Invalid image type. Allowed: jpeg, png, webp.', 400);
  }

  const imageUrl = await uploadService.uploadDoctorAvatar(file);

  sendResponse({
    res,
    statusCode: 201,
    message: 'Image uploaded successfully',
    data: {
      imageUrl,
    },
  });
});
