import mongoose, { Schema, Document, Types } from 'mongoose';

export type AppointmentStatus = 'pending' | 'seen' | 'missed';

export interface IAppointment extends Document {
  doctorId: Types.ObjectId;
  fullName: string;
  age: number;
  phoneNumber: string;
  preferredDate: string; // YYYY-MM-DD
  preferredTime: string; // HH:MM
  orderNumber: string;   // A101, A102, etc.
  status: AppointmentStatus;
  createdAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor ID is required'],
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [0, 'Age cannot be negative'],
      max: [150, 'Age cannot exceed 150'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    preferredDate: {
      type: String,
      required: [true, 'Preferred date is required'],
    },
    preferredTime: {
      type: String,
      required: [true, 'Preferred time is required'],
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'seen', 'missed'],
        message: 'Status must be one of: pending, seen, missed',
      },
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index to prevent double-booking (same doctor, date, time)
appointmentSchema.index(
  { doctorId: 1, preferredDate: 1, preferredTime: 1 },
  { unique: true }
);

// Index for date-based queries
appointmentSchema.index({ preferredDate: 1 });

// Text search index
appointmentSchema.index({ fullName: 'text', phoneNumber: 'text' });

export const Appointment = mongoose.model<IAppointment>('Appointment', appointmentSchema);
