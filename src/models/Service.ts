import mongoose, { Schema, Document } from 'mongoose';

export interface IService extends Document {
  title: string;
  description?: string;
  price?: number;
  category: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    title: {
      type: String,
      required: [true, 'Service title is required'],
      trim: true,
      maxlength: [150, 'Service title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    price: {
      type: Number,
      min: [0, 'Price cannot be negative'],
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
  },
  {
    timestamps: true,
  }
);

serviceSchema.index({ category: 1, createdAt: -1 });
serviceSchema.index({ title: 1 });

export const Service = mongoose.model<IService>('Service', serviceSchema);
