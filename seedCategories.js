/**
 * Seed script – populates the Category collection with standard grocery categories.
 * Run once:  node backend/seedCategories.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

const CATEGORIES = [
  { name: 'Fruits',          description: 'Fresh and seasonal fruits',               image: '' },
  { name: 'Vegetables',      description: 'Farm-fresh vegetables',                   image: '' },
  { name: 'Dairy & Eggs',    description: 'Milk, cheese, butter, eggs and more',     image: '' },
  { name: 'Bakery & Bread',  description: 'Fresh-baked breads, cakes and pastries',  image: '' },
  { name: 'Meat & Seafood',  description: 'Chicken, fish, mutton and seafood',       image: '' },
  { name: 'Beverages',       description: 'Juices, soft drinks, tea, coffee, water', image: '' },
  { name: 'Snacks',          description: 'Chips, biscuits, namkeen and more',       image: '' },
  { name: 'Grains & Pulses', description: 'Rice, wheat, lentils and legumes',        image: '' },
  { name: 'Masalas & Spices',description: 'Spice powders, whole spices and blends',  image: '' },
  { name: 'Oil & Ghee',      description: 'Cooking oils, ghee and vanaspati',        image: '' },
  { name: 'Frozen Foods',    description: 'Frozen vegetables, meals and ice cream',  image: '' },
  { name: 'Personal Care',   description: 'Soaps, shampoos and hygiene products',    image: '' },
  { name: 'Cleaning',        description: 'Detergents, dishwash and cleaners',       image: '' },
  { name: 'Baby Products',   description: 'Baby food, diapers and care essentials',  image: '' },
  { name: 'Organic',         description: 'Certified organic and natural products',  image: '' },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Load model AFTER connecting
    const Category = require('./models/Category');

    let created = 0;
    let skipped = 0;

    for (const cat of CATEGORIES) {
      const slug = cat.name.toLowerCase().replace(/\s+/g, '-').replace(/[&]/g, 'and');
      const exists = await Category.findOne({ name: { $regex: new RegExp(`^${cat.name}$`, 'i') } });
      if (exists) {
        console.log(`  ⏭  Skipped  (already exists): ${cat.name}`);
        skipped++;
      } else {
        await Category.create({ ...cat, slug, isActive: true });
        console.log(`  ✔  Created : ${cat.name}`);
        created++;
      }
    }

    console.log(`\n🎉 Done! ${created} categories created, ${skipped} skipped.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
