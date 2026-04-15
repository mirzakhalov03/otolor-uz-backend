import { Request, Response } from 'express';
import { categoryService } from '../services/category.service';
import { sendResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name, slug } = req.body;

  const category = await categoryService.createCategory({
    name,
    slug,
  });

  sendResponse({
    res,
    statusCode: 201,
    message: 'Category created successfully',
    data: category,
  });
});

export const getCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await categoryService.getAllCategories();

  sendResponse({
    res,
    message: 'Categories retrieved successfully',
    data: categories,
  });
});
