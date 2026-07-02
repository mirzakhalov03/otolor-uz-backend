import { Appointment, IAppointment, AppointmentStatus } from '../models/Appointment';
import { getNextOrderNumber } from '../models/Counter';
import { doctorService } from './doctor.service';
import { AppError, NotFoundError, BadRequestError, ConflictError } from '../utils/AppError';
import { escapeRegex } from '../utils/escapeRegex';
import { generateSlots } from '../utils/time';

interface CreateAppointmentData {
  doctorId: string;
  fullName: string;
  age: number;
  phoneNumber: string;
  selectedDate: string; // YYYY-MM-DD
  selectedTime: string; // HH:MM
}

interface GetAppointmentsQuery {
  date?: string;
  doctorId?: string;
  status?: AppointmentStatus;
  search?: string;
  page?: number;
  limit?: number;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class AppointmentService {
  /**
   * Creates a new appointment after validating:
   * 1. Doctor exists
   * 2. Selected date is in the doctor's schedule
   * 3. Selected time is within working hours for that date
   * 4. No double-booking for the same doctor/date/time
   */
  async createAppointment(data: CreateAppointmentData): Promise<IAppointment> {
    const { doctorId, fullName, age, phoneNumber, selectedDate, selectedTime } = data;

    // 1. Verify doctor exists
    const doctor = await doctorService.getDoctorById(doctorId);

    // 2. Check if the doctor has this specific date in their schedule
    const daySchedule = doctorService.getScheduleForDate(doctor, selectedDate);
    if (!daySchedule) {
      throw BadRequestError(
        `Dr. ${doctor.name} is not available on ${selectedDate}`
      );
    }

    // 3. The selected time must be one of the generated 30-min slots
    const availableSlots = generateSlots(daySchedule.start, daySchedule.end);
    if (!availableSlots.includes(selectedTime)) {
      throw BadRequestError(
        `Selected time ${selectedTime} is not an available slot for Dr. ${doctor.name} ` +
          `(working hours ${daySchedule.start}-${daySchedule.end}, 30-minute slots)`
      );
    }

    // 4. Check for double-booking
    const existingAppointment = await Appointment.findOne({
      doctorId,
      preferredDate: selectedDate,
      preferredTime: selectedTime,
    });

    if (existingAppointment) {
      throw ConflictError(
        `Time slot ${selectedTime} on ${selectedDate} is already booked for Dr. ${doctor.name}`
      );
    }

    // 5. Generate unique order number
    const orderNumber = await getNextOrderNumber();

    // 6. Create the appointment
    const appointment = await Appointment.create({
      doctorId,
      fullName,
      age,
      phoneNumber,
      preferredDate: selectedDate,
      preferredTime: selectedTime,
      orderNumber,
      status: 'pending',
    });

    return appointment.populate('doctorId', 'name specialization');
  }

  /**
   * Get available dates for a doctor.
   * Now returns only dates that exist in the doctor's weeklySchedule
   * (which are specific dates for the upcoming week, not repeating day names).
   */
  async getAvailableDates(doctorId: string): Promise<string[]> {
    const doctor = await doctorService.getDoctorById(doctorId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // The schedule keys are specific dates — return only future ones, sorted
    const availableDates = Object.keys(doctor.weeklySchedule)
      .filter((dateStr) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date >= today;
      })
      .sort();

    return availableDates;
  }

  /**
   * Get available time slots for a doctor on a specific date.
   * Filters out already-booked slots.
   */
  async getAvailableTimes(
    doctorId: string,
    date: string
  ): Promise<string[]> {
    const doctor = await doctorService.getDoctorById(doctorId);

    // Get schedule for this specific date
    const daySchedule = doctorService.getScheduleForDate(doctor, date);
    if (!daySchedule) {
      return []; // Doctor doesn't work on this date
    }

    // Generate all possible slots
    const allSlots = generateSlots(daySchedule.start, daySchedule.end);

    // Get already booked slots (any status marks the slot as taken)
    const bookedAppointments = await Appointment.find({
      doctorId,
      preferredDate: date,
    }).select('preferredTime');

    const bookedTimes = new Set(
      bookedAppointments.map((a) => a.preferredTime)
    );

    // Filter out booked slots
    return allSlots.filter((slot) => !bookedTimes.has(slot));
  }

  /**
   * Get all appointments with filtering, search, and pagination.
   * Used by admin.
   */
  async getAppointments(
    queryParams: GetAppointmentsQuery
  ): Promise<PaginatedResult<IAppointment>> {
    const {
      date,
      doctorId,
      status,
      search,
      page = 1,
      limit = 10,
    } = queryParams;

    const filter: Record<string, unknown> = {};

    if (date) filter.preferredDate = date;
    if (doctorId) filter.doctorId = doctorId;
    if (status) filter.status = status;

    if (search) {
      const safe = escapeRegex(search);
      filter.$or = [
        { fullName: { $regex: safe, $options: 'i' } },
        { phoneNumber: { $regex: safe, $options: 'i' } },
        { orderNumber: { $regex: safe, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('doctorId', 'name specialization')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Appointment.countDocuments(filter),
    ]);

    return {
      data: appointments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update appointment status.
   * Only pending appointments can be updated.
   */
  async updateStatus(
    id: string,
    newStatus: AppointmentStatus
  ): Promise<IAppointment> {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw NotFoundError('Appointment');
    }

    if (appointment.status !== 'pending') {
      throw BadRequestError(
        `Cannot update status. Appointment is already "${appointment.status}"`
      );
    }

    if (!['seen', 'missed'].includes(newStatus)) {
      throw BadRequestError('Status can only be updated to "seen" or "missed"');
    }

    appointment.status = newStatus;
    await appointment.save();

    return appointment.populate('doctorId', 'name specialization');
  }

  /**
   * Delete an appointment by ID.
   */
  async deleteAppointment(id: string): Promise<IAppointment> {
    const appointment = await Appointment.findByIdAndDelete(id);
    if (!appointment) {
      throw NotFoundError('Appointment');
    }
    return appointment;
  }
}

export const appointmentService = new AppointmentService();
