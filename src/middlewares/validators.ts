import { body, param, query } from 'express-validator';
import { getClinicToday } from '../utils/date';
import { env } from '../config/env';
import { assertValidWeeklySchedule } from '../utils/schedule';

/**
 * Validation rules for appointment-related requests.
 */
export const appointmentValidators = {
  /**
   * Validates the create appointment request body.
   */
  create: [
    body('doctorId')
      .notEmpty()
      .withMessage('Doctor ID is required')
      .isMongoId()
      .withMessage('Invalid doctor ID format'),

    body('fullName')
      .notEmpty()
      .withMessage('Full name is required')
      .isString()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters'),

    body('age')
      .notEmpty()
      .withMessage('Age is required')
      .isInt({ min: 0, max: 150 })
      .withMessage('Age must be a number between 0 and 150'),

    body('phoneNumber')
      .notEmpty()
      .withMessage('Phone number is required')
      .isString()
      .trim()
      .matches(/^\+?[\d\s-]{7,15}$/)
      .withMessage('Please provide a valid phone number'),

    body('selectedDate')
      .notEmpty()
      .withMessage('Selected date is required')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format')
      .custom((value: string) => {
        if (value < getClinicToday(env.clinicTimezone)) {
          throw new Error('Cannot book appointments in the past');
        }
        return true;
      }),

    body('selectedTime')
      .notEmpty()
      .withMessage('Selected time is required')
      .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
      .withMessage('Time must be in HH:MM format (24-hour)'),
  ],

  /**
   * Validates the status update request.
   */
  updateStatus: [
    param('id')
      .isMongoId()
      .withMessage('Invalid appointment ID format'),

    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['seen', 'missed'])
      .withMessage('Status must be either "seen" or "missed"'),
  ],

  /**
   * Validates the delete request.
   */
  delete: [
    param('id')
      .isMongoId()
      .withMessage('Invalid appointment ID format'),
  ],
};

/**
 * Validation rules for doctor-related requests.
 */
export const doctorValidators = {
  /**
   * Validates the create doctor request body.
   */
  create: [
    body('name')
      .notEmpty()
      .withMessage('Doctor name is required')
      .isString()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),

    body('specialization')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Specialization cannot exceed 100 characters'),

    body('avatarUrl')
      .optional()
      .isURL()
      .withMessage('Avatar URL must be a valid URL')
      .isLength({ max: 2000 })
      .withMessage('Avatar URL cannot exceed 2000 characters'),

    body('experience')
      .optional()
      .isInt({ min: 0, max: 80 })
      .withMessage('Experience must be a whole number between 0 and 80'),

    body('isFeatured')
      .optional()
      .isBoolean()
      .withMessage('isFeatured must be a boolean'),

    body('weeklySchedule')
      .notEmpty()
      .withMessage('Weekly schedule is required')
      .isObject()
      .withMessage('Schedule must be an object')
      .custom(assertValidWeeklySchedule),
  ],

  /**
   * Validates the doctor update request.
   * All fields are optional — only provided fields are updated.
   */
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid doctor ID format'),

    body('name')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),

    body('specialization')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Specialization cannot exceed 100 characters'),

    body('avatarUrl')
      .optional()
      .isURL()
      .withMessage('Avatar URL must be a valid URL')
      .isLength({ max: 2000 })
      .withMessage('Avatar URL cannot exceed 2000 characters'),

    body('experience')
      .optional()
      .isInt({ min: 0, max: 80 })
      .withMessage('Experience must be a whole number between 0 and 80'),

    body('isFeatured')
      .optional()
      .isBoolean()
      .withMessage('isFeatured must be a boolean'),

    body('weeklySchedule')
      .optional()
      .isObject()
      .withMessage('Schedule must be an object')
      .custom(assertValidWeeklySchedule),
  ],

  /**
   * Validates the delete doctor request.
   */
  delete: [
    param('id')
      .isMongoId()
      .withMessage('Invalid doctor ID format'),
  ],
};

/**
 * Validation for query parameters.
 */
export const queryValidators = {
  /**
   * Validates the availability query.
   * - doctorId is always required
   * - date is optional, but validated if provided
   */
  availability: [
    query('doctorId')
      .notEmpty()
      .withMessage('Doctor ID is required')
      .isMongoId()
      .withMessage('Invalid doctor ID format'),

    query('date')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format'),
  ],
};

/**
 * Validation rules for category-related requests.
 */
export const categoryValidators = {
  create: [
    body('name')
      .notEmpty()
      .withMessage('Category name is required')
      .isString()
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage('Category name must be between 2 and 120 characters'),

    body('slug')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2, max: 150 })
      .withMessage('Slug must be between 2 and 150 characters')
      .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .withMessage('Slug must contain lowercase letters, numbers, and hyphens only'),
  ],

  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid category ID format'),

    body('name')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage('Category name must be between 2 and 120 characters'),

    body('slug')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2, max: 150 })
      .withMessage('Slug must be between 2 and 150 characters')
      .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .withMessage('Slug must contain lowercase letters, numbers, and hyphens only'),
  ],

  delete: [
    param('id')
      .isMongoId()
      .withMessage('Invalid category ID format'),
  ],
};

/**
 * Validation rules for service-related requests.
 */
export const serviceValidators = {
  create: [
    body('title')
      .notEmpty()
      .withMessage('Service title is required')
      .isString()
      .trim()
      .isLength({ min: 2, max: 150 })
      .withMessage('Service title must be between 2 and 150 characters'),

    body('description')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Description cannot exceed 2000 characters'),

    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a non-negative number'),

    body('category')
      .notEmpty()
      .withMessage('Category is required')
      .isMongoId()
      .withMessage('Invalid category ID format'),
  ],

  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid service ID format'),

    body('title')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2, max: 150 })
      .withMessage('Service title must be between 2 and 150 characters'),

    body('description')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Description cannot exceed 2000 characters'),

    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a non-negative number'),

    body('category')
      .optional()
      .isMongoId()
      .withMessage('Invalid category ID format'),
  ],

  delete: [
    param('id')
      .isMongoId()
      .withMessage('Invalid service ID format'),
  ],

  getById: [
    param('id')
      .isMongoId()
      .withMessage('Invalid service ID format'),
  ],

  list: [
    query('categoryId')
      .optional()
      .isMongoId()
      .withMessage('Invalid categoryId format'),
  ],
};

/**
 * Validation rules for authentication requests.
 */
export const authValidators = {
  login: [
    body('username')
      .notEmpty()
      .withMessage('Username is required')
      .isString(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isString(),
  ],
};
