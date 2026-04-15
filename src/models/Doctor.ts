import mongoose, { Schema, Document } from 'mongoose';

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
  weeklySchedule: IWeeklySchedule;
  createdAt: Date;
  updatedAt: Date;
}

const dateKeyRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRangeRegex = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;

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
    weeklySchedule: {
      type: Schema.Types.Mixed,
      required: [true, 'Weekly schedule is required'],
      validate: {
        validator: function (schedule: IWeeklySchedule): boolean {
          if (!schedule || typeof schedule !== 'object') return false;

          for (const [key, time] of Object.entries(schedule)) {
            // Keys must be YYYY-MM-DD dates
            if (!dateKeyRegex.test(key)) return false;
            // Values must be HH:MM-HH:MM time ranges
            if (typeof time !== 'string' || !timeRangeRegex.test(time)) return false;
          }
          return Object.keys(schedule).length > 0;
        },
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
