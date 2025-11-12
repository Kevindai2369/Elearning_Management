const bcrypt = require('bcrypt');
const { User, Semester, Course } = require('../models');
const { connectDB } = require('../config/database');

/**
 * Seed initial data
 */
const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // Connect to database
    await connectDB();

    // Check if admin user already exists
    const existingAdmin = await User.findOne({
      where: { email: 'admin@elearning.com' }
    });

    if (existingAdmin) {
      console.log('Admin user already exists. Skipping seed.');
      return;
    }

    // Create admin/instructor user
    const hashedPassword = await bcrypt.hash('admin', 10);
    const adminUser = await User.create({
      email: 'admin@elearning.com',
      password_hash: hashedPassword,
      name: 'Admin User',
      role: 'instructor'
    });
    console.log('✓ Admin user created (email: admin@elearning.com, password: admin)');

    // Create sample semester
    const semester = await Semester.create({
      name: 'Fall 2024',
      code: 'FALL2024',
      start_date: new Date('2024-09-01'),
      end_date: new Date('2024-12-31'),
      is_active: true
    });
    console.log('✓ Sample semester created');

    // Create sample course
    const course = await Course.create({
      semester_id: semester.id,
      name: 'Introduction to Computer Science',
      code: 'CS101',
      description: 'An introductory course covering fundamental concepts of computer science',
      instructor_id: adminUser.id
    });
    console.log('✓ Sample course created');

    console.log('\n=== Database seeding completed successfully ===');
    console.log('Login credentials:');
    console.log('  Email: admin@elearning.com');
    console.log('  Password: admin');
    console.log('===============================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run seed if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
