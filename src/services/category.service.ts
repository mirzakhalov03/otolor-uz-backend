import { Category, ICategory } from '../models/Category';
import { Service } from '../models/Service';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/AppError';

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

  async updateCategory(
    id: string,
    data: { name?: string; slug?: string }
  ): Promise<ICategory> {
    const category = await Category.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!category) {
      throw NotFoundError('Category');
    }
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    // Guarded delete: refuse while any service still references this category.
    if (await Service.exists({ category: id })) {
      throw ConflictError('Cannot delete: category is in use by one or more services');
    }

    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) {
      throw NotFoundError('Category');
    }
  }
}

export const categoryService = new CategoryService();
