import { Doctor, IDoctor, IWeeklySchedule } from '../models/Doctor';
import { AppError, NotFoundError } from '../utils/AppError';
import { escapeRegex } from '../utils/escapeRegex';
import { getClinicToday } from '../utils/date';
import { assertScheduleWithinWindow } from '../utils/schedule';
import { env } from '../config/env';

export class DoctorService {
  /**
   * Create a new doctor with their schedule.
   * Schedule keys are specific dates (YYYY-MM-DD) within the next 7 days.
   */
  async createDoctor(data: {
    name: string;
    specialization?: string;
    avatarUrl?: string;
    weeklySchedule: IWeeklySchedule;
  }): Promise<IDoctor> {
    // Validate that all date keys are within the next 7 days
    this.validateDateKeysWithin7Days(data.weeklySchedule);

    const doctor = await Doctor.create(data);
    return doctor;
  }

  /**
   * Get all doctors, optionally searching by name or specialization.
   */
  async getAllDoctors(search?: string): Promise<IDoctor[]> {
    const filter: Record<string, unknown> = {};

    if (search) {
      const safe = escapeRegex(search);
      filter.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { specialization: { $regex: safe, $options: 'i' } },
      ];
    }

    return Doctor.find(filter).sort({ name: 1 });
  }

  /**
   * Get a single doctor by ID.
   */
  async getDoctorById(id: string): Promise<IDoctor> {
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      throw NotFoundError('Doctor');
    }
    return doctor;
  }

  /**
   * Update a doctor's details (name, specialization, and/or schedule).
   * If the schedule is being changed, validates that no pending appointments
   * would fall outside the new working hours.
   */
  async updateDoctor(
    id: string,
    data: {
      name?: string;
      specialization?: string;
      avatarUrl?: string;
      weeklySchedule?: IWeeklySchedule;
    }
  ): Promise<IDoctor> {
    // Verify doctor exists first
    const existingDoctor = await Doctor.findById(id);
    if (!existingDoctor) {
      throw NotFoundError('Doctor');
    }

    // If schedule is being updated, validate dates and check for conflicts
    if (data.weeklySchedule) {
      this.validateDateKeysWithin7Days(data.weeklySchedule);
      await this.validateScheduleChange(id, existingDoctor.name, data.weeklySchedule);
    }

    const doctor = await Doctor.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );

    return doctor!;
  }

  /**
   * Validates that all date keys in the schedule are within the next 7 days from today.
   */
  private validateDateKeysWithin7Days(schedule: IWeeklySchedule): void {
    assertScheduleWithinWindow(schedule, getClinicToday(env.clinicTimezone));
  }

  /**
   * Checks if changing a doctor's schedule would conflict with existing
   * pending appointments. Two cases are caught:
   *  1. A date is removed entirely
   *  2. Working hours are shortened, leaving appointments outside the new range
   */
  private async validateScheduleChange(
    doctorId: string,
    doctorName: string,
    newSchedule: IWeeklySchedule
  ): Promise<void> {
    const { Appointment } = await import('../models/Appointment');

    // Get all pending appointments for this doctor
    const pendingAppointments = await Appointment.find({
      doctorId,
      status: 'pending',
    }).select('preferredDate preferredTime');

    if (pendingAppointments.length === 0) return;

    const conflicts: string[] = [];

    for (const appt of pendingAppointments) {
      const dateStr = appt.preferredDate;
      const timeRange = newSchedule[dateStr];

      if (!timeRange) {
        // Date was removed from schedule — only flag if the date is still in the future
        if (dateStr >= getClinicToday(env.clinicTimezone)) {
          conflicts.push(`${dateStr} at ${appt.preferredTime} — date removed from schedule`);
        }
        continue;
      }

      // Check if the appointment time falls within the new hours
      const [startTime, endTime] = timeRange.split('-');
      const [apptH, apptM] = appt.preferredTime.split(':').map(Number);
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);

      const apptMinutes = apptH * 60 + apptM;
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (apptMinutes < startMinutes || apptMinutes >= endMinutes) {
        conflicts.push(
          `${dateStr} at ${appt.preferredTime} — outside new hours ${timeRange}`
        );
      }
    }

    if (conflicts.length > 0) {
      throw new AppError(
        `Cannot update schedule for Dr. ${doctorName} — ${conflicts.length} pending appointment(s) would conflict:\n` +
        conflicts.map((c) => `  • ${c}`).join('\n') +
        '\n\nReschedule or cancel these appointments first.',
        400
      );
    }
  }

  /**
   * Delete a doctor by ID.
   * Prevents deletion if the doctor has pending appointments.
   */
  async deleteDoctor(id: string): Promise<IDoctor> {
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      throw NotFoundError('Doctor');
    }

    // Check for pending appointments before deleting
    const { Appointment } = await import('../models/Appointment');
    const pendingCount = await Appointment.countDocuments({
      doctorId: id,
      status: 'pending',
    });

    if (pendingCount > 0) {
      throw new AppError(
        `Cannot delete Dr. ${doctor.name} — they have ${pendingCount} pending appointment(s). Update or cancel them first.`,
        400
      );
    }

    await Doctor.findByIdAndDelete(id);
    return doctor;
  }

  /**
   * Get the working schedule for a specific doctor on a specific date.
   * Returns null if the doctor doesn't work on that date.
   */
  getScheduleForDate(
    doctor: IDoctor,
    dateStr: string
  ): { start: string; end: string } | null {
    const schedule = doctor.weeklySchedule[dateStr];
    if (!schedule) return null;

    const [start, end] = schedule.split('-');
    return { start, end };
  }

  /**
   * Generate all available time slots for a given time range.
   * Each slot is 30 minutes.
   */
  generateTimeSlots(startTime: string, endTime: string): string[] {
    const slots: string[] = [];
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes < endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const minutes = currentMinutes % 60;
      slots.push(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      );
      currentMinutes += 30; // 30-minute intervals
    }

    return slots;
  }
}

export const doctorService = new DoctorService();
