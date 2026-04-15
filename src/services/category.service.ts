import { Category, ICategory } from '../models/Category';
import { BadRequestError } from '../utils/AppError';

export class CategoryService {
  async createCategory(data: { name: string; slug?: string }): Promise<ICategory> {
    const category = await Category.create(data);
    return category;
  }

  async getAllCategories(): Promise<ICategory[]> {
    return Category.find().sort({ createdAt: -1 });
  }

  async ensureCategoryExists(categoryId: string): Promise<void> {
    const exists = await Category.exists({ _id: categoryId });
    if (!exists) {
      throw BadRequestError('Category not found');
    }
  }
}

export const categoryService = new CategoryService();
