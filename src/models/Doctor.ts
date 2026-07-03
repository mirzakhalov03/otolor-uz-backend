import mongoose, { Schema, Document } from 'mongoose';
import { isValidWeeklySchedule } from '../utils/schedule';

/**
 * Weekly schedule uses specific dates (YYYY-MM-DD) as keys,
 * limited to the next 7 days from today.
 * Example: { "2026-04-14": "09:00-16:00", "2026-04-15": "09:00-17:00" }
 */
export interface IWeeklySchedule {
  [date: string]: string; // date (YYYY-MM-DD) → "HH:MM-HH:MM"
}

export interface IDoctor extends Document {
  name: string;
  specialization?: string;
  avatarUrl?: string;
  experience?: number; // years of experience, shown on public profile cards
  isFeatured?: boolean; // surface on the public About page / home carousel
  weeklySchedule: IWeeklySchedule;
  createdAt: Date;
  updatedAt: Date;
}

const doctorSchema = new Schema<IDoctor>(
  {
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    specialization: {
      type: String,
      trim: true,
      maxlength: [100, 'Specialization cannot exceed 100 characters'],
    },
    avatarUrl: {
      type: String,
      trim: true,
      maxlength: [2000, 'Avatar URL cannot exceed 2000 characters'],
    },
    experience: {
      type: Number,
      min: [0, 'Experience cannot be negative'],
      max: [80, 'Experience cannot exceed 80 years'],
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    weeklySchedule: {
      type: Schema.Types.Mixed,
      required: [true, 'Weekly schedule is required'],
      validate: {
        validator: (schedule: IWeeklySchedule): boolean => isValidWeeklySchedule(schedule),
        message:
          'Invalid schedule format. Use date strings (YYYY-MM-DD) as keys and "HH:MM-HH:MM" as values.',
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for search by name
doctorSchema.index({ name: 'text', specialization: 'text' });

export const Doctor = mongoose.model<IDoctor>('Doctor', doctorSchema);
