import mongoose from 'mongoose';
import { env } from '../config/env';
import { Category } from '../models/Category';
import { Service } from '../models/Service';
import { servicesSeed } from '../data/services-seed';

/**
 * Idempotent seed for the "Our Services" price list.
 *
 * For each category it upserts the Category (by name) and then replaces that
 * category's services with the canonical list from `data/services-seed.ts`.
 * Re-running always converges the DB to the source document — safe to run
 * repeatedly. Only the seeded categories are touched; other data is untouched.
 */
async function seedServices(): Promise<void> {
  await mongoose.connect(env.mongoUri);
  console.log(`Connected to MongoDB (${mongoose.connection.name})`);

  for (const seedCategory of servicesSeed) {
    const category = await Category.findOneAndUpdate(
      { name: seedCategory.name },
      { $set: { name: seedCategory.name, slug: seedCategory.slug } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const removed = await Service.deleteMany({ category: category._id });

    const docs = seedCategory.services.map((service) => ({
      title: service.title,
      ...(service.description ? { description: service.description } : {}),
      price: service.price,
      category: category._id,
    }));

    const inserted = await Service.insertMany(docs);

    console.log(
      `✓ ${category.name}: inserted ${inserted.length} services ` +
        `(cleared ${removed.deletedCount ?? 0})`
    );
  }

  await mongoose.disconnect();
  console.log('Seed complete.');
}

seedServices()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
