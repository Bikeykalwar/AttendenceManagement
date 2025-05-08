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
    role: { type: String, enum: ['staff', 'student'], required: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

async function createTestUser() {
    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash('test123', 10);

        // Create a test staff user
        const testUser = new User({
            username: 'staff123',
            password: hashedPassword,
            role: 'staff',
            email: 'staff@test.com',
            name: 'Test Staff'
        });

        await testUser.save();
        console.log('Test user created successfully');
        mongoose.connection.close();
    } catch (error) {
        console.error('Error creating test user:', error);
        mongoose.connection.close();
    }
}

createTestUser(); 