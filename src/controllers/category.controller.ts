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

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name, slug } = req.body;

  const category = await categoryService.updateCategory(id, { name, slug });

  sendResponse({
    res,
    message: 'Category updated successfully',
    data: category,
  });
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  await categoryService.deleteCategory(id);

  sendResponse({
    res,
    message: 'Category deleted successfully',
  });
});
