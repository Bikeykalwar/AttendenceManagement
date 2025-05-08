const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/school_attendance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff', 'student'], required: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

async function createAdminUser() {
    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Create admin user
        const adminUser = new User({
            username: 'admin',
            password: hashedPassword,
            role: 'admin',
            email: 'admin@school.com',
            name: 'System Admin'
        });

        await adminUser.save();
        console.log('Admin user created successfully');

        // Create a test staff user
        const staffPassword = await bcrypt.hash('staff123', 10);
        const staffUser = new User({
            username: 'staff',
            password: staffPassword,
            role: 'staff',
            email: 'staff@school.com',
            name: 'Test Staff'
        });

        await staffUser.save();
        console.log('Staff user created successfully');

        mongoose.connection.close();
    } catch (error) {
        console.error('Error creating users:', error);
        mongoose.connection.close();
    }
}

createAdminUser(); 