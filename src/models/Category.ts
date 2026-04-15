import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug?: string;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [120, 'Category name cannot exceed 120 characters'],
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [150, 'Slug cannot exceed 150 characters'],
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ name: 1 }, { unique: true });
categorySchema.index({ slug: 1 }, { unique: true, sparse: true });

export const Category = mongoose.model<ICategory>('Category', categorySchema);
