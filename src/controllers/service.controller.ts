import { Request, Response } from 'express';
import { serviceService } from '../services/service.service';
import { sendResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const createService = asyncHandler(async (req: Request, res: Response) => {
  const { title, description, price, category } = req.body;

  const service = await serviceService.createService({
    title,
    description,
    price,
    category,
  });

  sendResponse({
    res,
    statusCode: 201,
    message: 'Service created successfully',
    data: service,
  });
});

export const getServices = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.query;

  const services = await serviceService.getServices(categoryId as string | undefined);

  sendResponse({
    res,
    message: 'Services retrieved successfully',
    data: services,
  });
});

export const getServiceById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const service = await serviceService.getServiceById(id);

  sendResponse({
    res,
    message: 'Service retrieved successfully',
    data: service,
  });
});

export const updateService = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { title, description, price, category } = req.body;

  const service = await serviceService.updateService(id, {
    title,
    description,
    price,
    category,
  });

  sendResponse({
    res,
    message: 'Service updated successfully',
    data: service,
  });
});

export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const service = await serviceService.deleteService(id);

  sendResponse({
    res,
    message: `Service "${service.title}" deleted successfully`,
  });
});
