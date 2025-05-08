const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school_attendance')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff', 'student'], required: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

async function createTestStudent() {
    try {
        // Remove existing test student if exists
        await User.deleteOne({ username: 'student1' });

        // Create new test student
        const hashedPassword = await bcrypt.hash('password123', 10);
        const student = new User({
            username: 'student1',
            password: hashedPassword,
            role: 'student',
            email: 'student1@school.com',
            name: 'Test Student One'
        });

        await student.save();
        console.log('Test student created successfully!');
        console.log('Login details:');
        console.log('Username: student1');
        console.log('Password: password123');
        console.log('\nPlease use these exact credentials to log in.');
    } catch (error) {
        console.error('Error creating test student:', error);
    } finally {
        mongoose.connection.close();
    }
}

createTestStudent(); 