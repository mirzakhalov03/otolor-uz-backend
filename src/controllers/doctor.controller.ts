import { Request, Response } from 'express';
import { doctorService } from '../services/doctor.service';
import { sendResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * @description Create a new doctor
 */
export const createDoctor = asyncHandler(async (req: Request, res: Response) => {
  const { name, specialization, avatarUrl, weeklySchedule } = req.body;

  const doctor = await doctorService.createDoctor({
    name,
    specialization,
    avatarUrl,
    weeklySchedule,
  });

  sendResponse({
    res,
    statusCode: 201,
    message: 'Doctor created successfully',
    data: doctor,
  });
});

/**
 * @description Get all doctors
 */
export const getDoctors = asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;

  const doctors = await doctorService.getAllDoctors(search as string);

  sendResponse({
    res,
    message: 'Doctors retrieved successfully',
    data: doctors,
  });
});

/**
 * @description Get a single doctor by ID
 */
export const getDoctorById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const doctor = await doctorService.getDoctorById(id);

  sendResponse({
    res,
    message: 'Doctor retrieved successfully',
    data: doctor,
  });
});

/**
 * @description Update a doctor's details (name, specialization, schedule)
 */
export const updateDoctor = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { name, specialization, avatarUrl, weeklySchedule } = req.body;

    const doctor = await doctorService.updateDoctor(id, {
      name,
      specialization,
      avatarUrl,
      weeklySchedule,
    });

    sendResponse({
      res,
      message: 'Doctor updated successfully',
      data: doctor,
    });
  }
);

/**
 * @description Delete a doctor
 */
export const deleteDoctor = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const doctor = await doctorService.deleteDoctor(id);

    sendResponse({
      res,
      message: `Dr. ${doctor.name} deleted successfully`,
    });
  }
);
