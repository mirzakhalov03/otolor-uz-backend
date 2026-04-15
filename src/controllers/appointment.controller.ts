import { Request, Response } from 'express';
import { appointmentService } from '../services/appointment.service';
import { sendResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * @description Get availability for a doctor
 * - If only `doctorId` is provided → returns available dates (next 30 days)
 * - If `doctorId` + `date` are provided → returns available time slots for that date
 */
export const getAvailability = asyncHandler(
  async (req: Request, res: Response) => {
    const { doctorId, date } = req.query;

    // If date is provided, return available time slots
    if (date) {
      const times = await appointmentService.getAvailableTimes(
        doctorId as string,
        date as string
      );

      sendResponse({
        res,
        message: 'Available time slots retrieved successfully',
        data: times,
      });
      return;
    }

    // Otherwise, return available dates
    const dates = await appointmentService.getAvailableDates(
      doctorId as string
    );

    sendResponse({
      res,
      message: 'Available dates retrieved successfully',
      data: dates,
    });
  }
);

/**
 * @description Create a new appointment (public booking)
 */
export const createAppointment = asyncHandler(
  async (req: Request, res: Response) => {
    const appointment = await appointmentService.createAppointment(req.body);

    sendResponse({
      res,
      statusCode: 201,
      message: 'Appointment booked successfully',
      data: appointment,
    });
  }
);

/**
 * @description Get all appointments (admin) with filtering, search, and pagination
 */
export const getAppointments = asyncHandler(
  async (req: Request, res: Response) => {
    const { date, doctorId, status, search, page, limit } = req.query;

    const result = await appointmentService.getAppointments({
      date: date as string,
      doctorId: doctorId as string,
      status: status as any,
      search: search as string,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    sendResponse({
      res,
      message: 'Appointments retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  }
);

/**
 * @description Update appointment status (admin)
 */
export const updateAppointmentStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { status } = req.body;
    const id = req.params.id as string;

    const appointment = await appointmentService.updateStatus(id, status);

    sendResponse({
      res,
      message: `Appointment status updated to "${status}"`,
      data: appointment,
    });
  }
);

/**
 * @description Delete an appointment (admin)
 */
export const deleteAppointment = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await appointmentService.deleteAppointment(id);

    sendResponse({
      res,
      message: 'Appointment deleted successfully',
    });
  }
);
