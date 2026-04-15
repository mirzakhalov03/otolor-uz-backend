import mongoose, { Schema, Document } from 'mongoose';

export interface ICounter extends Document {
  name: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  seq: {
    type: Number,
    default: 100,
  },
});

export const Counter = mongoose.model<ICounter>('Counter', counterSchema);

/**
 * Atomically generates the next order number in the format A101, A102, etc.
 * Uses MongoDB's findOneAndUpdate with $inc to prevent race conditions.
 */
export const getNextOrderNumber = async (): Promise<string> => {
  const counter = await Counter.findOneAndUpdate(
    { name: 'appointment' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `A${counter.seq}`;
};
