import { Service, IService } from '../models/Service';
import { categoryService } from './category.service';
import { NotFoundError } from '../utils/AppError';

export class ServiceService {
  async createService(data: {
    title: string;
    description?: string;
    price?: number;
    category: string;
  }): Promise<IService> {
    await categoryService.ensureCategoryExists(data.category);

    const service = await Service.create(data);
    return service.populate('category', 'name slug');
  }

  async getServices(categoryId?: string): Promise<IService[]> {
    const filter: Record<string, unknown> = {};

    if (categoryId) {
      filter.category = categoryId;
    }

    return Service.find(filter)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 });
  }

  async getServiceById(id: string): Promise<IService> {
    const service = await Service.findById(id).populate('category', 'name slug');

    if (!service) {
      throw NotFoundError('Service');
    }

    return service;
  }

  async updateService(
    id: string,
    data: {
      title?: string;
      description?: string;
      price?: number;
      category?: string;
    }
  ): Promise<IService> {
    if (data.category) {
      await categoryService.ensureCategoryExists(data.category);
    }

    const service = await Service.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
      .populate('category', 'name slug');

    if (!service) {
      throw NotFoundError('Service');
    }

    return service;
  }

  async deleteService(id: string): Promise<IService> {
    const service = await Service.findByIdAndDelete(id).populate('category', 'name slug');

    if (!service) {
      throw NotFoundError('Service');
    }

    return service;
  }
}

export const serviceService = new ServiceService();
