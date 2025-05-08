const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use('/staff', express.static(path.join(__dirname, 'public', 'staff')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school_attendance', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Schemas
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff', 'student'], required: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true }
});

const attendanceSchema = new mongoose.Schema({
    classId: Number,
    date: Date,
    students: [{
        rollNo: String,
        name: String,
        status: Boolean
    }],
    staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff'
    }
}, { timestamps: true });

const classSchema = new mongoose.Schema({
    name: { type: String, required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

// Update LeaveRequest schema
const leaveRequestSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    duration: {
        type: Number,
        required: true,
        min: 1,
        max: 30
    },
    class: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    emergencyContact: {
        type: String,
        required: true,
        match: /^[0-9]{10}$/
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedAt: Date
}, { timestamps: true });

// Add Notification schema
const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    data: mongoose.Schema.Types.Mixed,
    read: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const Class = mongoose.model('Class', classSchema);
const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
const Notification = mongoose.model('Notification', notificationSchema);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Authentication Routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );

        res.json({
            success: true,
            token,
            role: user.role,
            redirectUrl: user.role === 'staff' ? '/staff/dashboard.html' : '/student/dashboard.html'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email, role } = req.body;
        const user = await User.findOne({ email, role });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // In a real application, you would:
        // 1. Generate a password reset token
        // 2. Save it to the database with an expiration
        // 3. Send an email with the reset link
        // For demo purposes, we'll just send a success response
        res.json({ success: true, message: 'Password reset instructions sent' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Dashboard Routes
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalStudents = await User.countDocuments({ role: 'student' });
        const todayAttendance = await Attendance.find({
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        const presentToday = todayAttendance.filter(a => a.status === 'present').length;
        const absentToday = todayAttendance.filter(a => a.status === 'absent').length;
        const lateToday = todayAttendance.filter(a => a.status === 'late').length;

        const recentAttendance = await Attendance.find()
            .sort({ date: -1 })
            .limit(10)
            .populate('studentId', 'name')
            .populate('markedBy', 'name');

        res.json({
            success: true,
            totalStudents,
            presentToday,
            absentToday,
            lateToday,
            recentAttendance: recentAttendance.map(a => ({
                studentName: a.studentId.name,
                date: a.date,
                status: a.status,
                markedBy: a.markedBy.name
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Class Routes
app.get('/api/classes', authenticateToken, async (req, res) => {
    try {
        const classes = await Class.find()
            .populate('teacher', 'name')
            .populate('students', 'name');
        res.json({ success: true, classes });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Attendance Routes
app.post('/api/attendance', authenticateToken, async (req, res) => {
    try {
        const { studentId, status, class: className, remarks } = req.body;
        const attendance = new Attendance({
            studentId,
            status,
            class: className,
            remarks,
            date: new Date(),
            markedBy: req.user.userId
        });
        await attendance.save();
        res.json({ success: true, message: 'Attendance marked successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/attendance', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate, class: className } = req.query;
        const query = {};

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        if (className) {
            query.class = className;
        }

        const attendance = await Attendance.find(query)
            .populate('studentId', 'name')
            .populate('markedBy', 'name')
            .sort({ date: -1 });

        res.json({ success: true, attendance });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Student Routes
app.get('/api/attendance/today', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            studentId: req.user.userId,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        res.json({ success: true, attendance });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/attendance/mark', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if attendance already marked for today
        const existingAttendance = await Attendance.findOne({
            studentId: req.user.userId,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (existingAttendance) {
            return res.status(400).json({ success: false, message: 'Attendance already marked for today' });
        }

        // Get student's class
        const student = await User.findById(req.user.userId);
        const studentClass = await Class.findOne({ students: req.user.userId });

        const attendance = new Attendance({
            studentId: req.user.userId,
            date: new Date(),
            status,
            class: studentClass ? studentClass.name : 'Not Assigned',
            markedBy: req.user.userId,
            remarks: 'Marked by student'
        });

        await attendance.save();
        res.json({ success: true, message: 'Attendance marked successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/attendance/history', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
        }

        const { startDate, endDate } = req.query;
        const query = {
            'students.rollNo': req.user.userId
        };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const attendanceRecords = await Attendance.find(query)
            .sort({ date: -1 })
            .populate('staffId', 'name');

        // Format the attendance records
        const formattedAttendance = attendanceRecords.map(record => {
            const studentRecord = record.students.find(s => s.rollNo === req.user.userId);
            return {
                date: record.date,
                status: studentRecord ? studentRecord.status : false,
                markedBy: record.staffId ? record.staffId.name : 'Staff',
                class: record.classId
            };
        });

        res.json({
            success: true,
            attendance: formattedAttendance
        });
    } catch (error) {
        console.error('Error fetching attendance history:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Staff Dashboard Routes
app.get('/api/staff/info', authenticateToken, async (req, res) => {
    try {
        const staff = await User.findById(req.user.userId).select('-password');
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching staff information' });
    }
});

app.get('/api/classes', authenticateToken, async (req, res) => {
    try {
        const classes = await Class.find();
        res.json(classes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching classes' });
    }
});

app.get('/api/students/class/:classId', authenticateToken, async (req, res) => {
    try {
        const students = await User.find({ class: req.params.classId })
            .select('studentId name class')
            .populate('class', 'name');
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students' });
    }
});

app.post('/api/attendance', authenticateToken, async (req, res) => {
    try {
        const { classId, date, attendance } = req.body;
        
        // Validate input
        if (!classId || !date || !attendance || !Array.isArray(attendance)) {
            return res.status(400).json({ message: 'Invalid attendance data' });
        }

        // Create attendance records
        const attendanceRecords = attendance.map(record => ({
            student: record.studentId,
            class: classId,
            date: new Date(date),
            isPresent: record.isPresent,
            markedBy: req.user.userId
        }));

        // Save attendance records
        await Attendance.insertMany(attendanceRecords);

        res.json({ message: 'Attendance saved successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error saving attendance' });
    }
});

// Protected route middleware
app.use('/staff/*', authenticateToken, (req, res, next) => {
    if (req.user.role !== 'staff') {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
});

// Handle dashboard routes
app.get('/staff/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'staff', 'dashboard.html'));
});

// Catch-all route for the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    // Join class room
    socket.on('joinClass', (room) => {
        socket.join(room);
    });

    // Real-time attendance update (emit to class room)
    socket.on('attendanceMarked', (data) => {
        if (data.classRoom) {
            io.to(data.classRoom).emit('attendanceUpdate', data);
        }
    });

    // Real-time class chat
    socket.on('classMessage', (data) => {
        if (data.room) {
            io.to(data.room).emit('classMessage', data);
        }
    });
});

// Modified attendance marking endpoint
app.post('/api/attendance/save', authenticateToken, async (req, res) => {
    try {
        const { classId, date, students } = req.body;
        
        if (!classId || !date || !students) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: classId, date, or students' 
            });
        }

        // Check if attendance already exists for this class and date
        let attendance = await Attendance.findOne({
            classId: parseInt(classId),
            date: new Date(date),
            staffId: req.user.userId
        });

        if (attendance) {
            // Update existing attendance
            attendance.students = students;
            await attendance.save();
        } else {
            // Create new attendance record
            attendance = new Attendance({
                classId: parseInt(classId),
                date: new Date(date),
                students,
                staffId: req.user.userId
            });
            await attendance.save();
        }

        // Emit real-time update to students in this class
        io.to(`class_${classId}`).emit('attendanceUpdate', {
            classId,
            date,
            attendance: {
                total: students.length,
                present: students.filter(s => s.status).length,
                data: students
            }
        });

        res.json({ success: true, message: 'Attendance saved successfully' });
    } catch (error) {
        console.error('Error saving attendance:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to save attendance',
            error: error.message 
        });
    }
});

// Update server startup
const startServer = async (retries = 5) => {
    const PORT = process.env.PORT || 3000;
    try {
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        if (error.code === 'EADDRINUSE') {
            if (retries > 0) {
                console.log(`Port ${PORT} is busy, trying alternative port ${PORT + 1}`);
                process.env.PORT = PORT + 1;
                await startServer(retries - 1);
            } else {
                console.error('No available ports found after multiple retries');
                process.exit(1);
            }
        } else {
            console.error('Server failed to start:', error);
            process.exit(1);
        }
    }
};

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});

// Start the server
startServer();

// Update the attendance API routes
app.get('/api/attendance/class/:classId', authenticateToken, async (req, res) => {
    try {
        const { classId } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ 
                success: false, 
                message: 'Date parameter is required' 
            });
        }

        const attendance = await Attendance.findOne({
            classId: parseInt(classId),
            date: new Date(date),
            staffId: req.user.userId // Use userId from token
        });

        if (attendance) {
            res.json({ success: true, data: attendance });
        } else {
            res.json({ success: true, data: null });
        }
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch attendance',
            error: error.message 
        });
    }
});

app.get('/api/attendance/history/:classId', authenticateToken, async (req, res) => {
    try {
        const { classId } = req.params;
        const { startDate, endDate } = req.query;

        const query = {
            classId,
            staffId: req.user._id
        };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const attendanceHistory = await Attendance.find(query)
            .sort({ date: -1 })
            .limit(30);

        res.json({ success: true, data: attendanceHistory });
    } catch (error) {
        console.error('Error fetching attendance history:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch attendance history' });
    }
});

// Student Routes
app.get('/api/student/profile', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
        }

        const student = await User.findById(req.user.userId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // Get the class information
        const studentClass = await Class.findOne({ students: student._id });

        res.json({
            success: true,
            name: student.name,
            email: student.email,
            class: studentClass ? studentClass.name : null
        });
    } catch (error) {
        console.error('Error fetching student profile:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Student Attendance Summary Route with Monthly Data
app.get('/api/attendance/summary', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
        }

        // Get all attendance records for the student
        const attendanceRecords = await Attendance.find({
            'students.rollNo': req.user.userId
        }).sort({ date: 1 });

        // Calculate summary
        const totalClasses = attendanceRecords.length;
        const presentCount = attendanceRecords.filter(record => 
            record.students.find(student => 
                student.rollNo === req.user.userId && student.status
            )
        ).length;

        // Calculate monthly data
        const monthlyData = [];
        const months = {};

        attendanceRecords.forEach(record => {
            const month = record.date.toLocaleString('default', { month: 'short', year: '2-digit' });
            if (!months[month]) {
                months[month] = { total: 0, present: 0 };
            }
            months[month].total++;
            
            const studentRecord = record.students.find(s => s.rollNo === req.user.userId);
            if (studentRecord && studentRecord.status) {
                months[month].present++;
            }
        });

        Object.entries(months).forEach(([month, data]) => {
            monthlyData.push({
                month,
                percentage: ((data.present / data.total) * 100).toFixed(2)
            });
        });

        res.json({
            success: true,
            totalClasses,
            presentCount,
            absentCount: totalClasses - presentCount,
            monthlyData
        });
    } catch (error) {
        console.error('Error fetching attendance summary:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Subject-wise Attendance Route
app.get('/api/attendance/subjects', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
        }

        // Get student's class
        const studentClass = await Class.findOne({ students: req.user.userId });
        if (!studentClass) {
            return res.json({ success: true, subjects: [] });
        }

        // Get attendance records grouped by subject
        const attendanceRecords = await Attendance.aggregate([
            {
                $match: {
                    'students.rollNo': req.user.userId,
                    classId: studentClass._id
                }
            },
            {
                $group: {
                    _id: '$subject',
                    total: { $sum: 1 },
                    present: {
                        $sum: {
                            $cond: [
                                {
                                    $in: [
                                        true,
                                        '$students.status'
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const subjects = attendanceRecords.map(record => ({
            name: record._id || 'General',
            total: record.total,
            present: record.present,
            percentage: ((record.present / record.total) * 100).toFixed(2)
        }));

        res.json({ success: true, subjects });
    } catch (error) {
        console.error('Error fetching subject-wise attendance:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Generate and Download Attendance Report
app.get('/api/attendance/report', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
        }

        // Get student details
        const student = await User.findById(req.user.userId);
        const studentClass = await Class.findOne({ students: req.user.userId });

        // Get attendance records
        const attendanceRecords = await Attendance.find({
            'students.rollNo': req.user.userId
        }).sort({ date: -1 });

        // Calculate statistics
        const totalClasses = attendanceRecords.length;
        const presentCount = attendanceRecords.filter(record => 
            record.students.find(s => s.rollNo === req.user.userId && s.status)
        ).length;
        const attendancePercentage = ((presentCount / totalClasses) * 100).toFixed(2);

        // Generate PDF report
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument();

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${student.name}.pdf`);

        doc.pipe(res);

        // Add content to PDF
        doc.fontSize(20).text('Attendance Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Name: ${student.name}`);
        doc.text(`Class: ${studentClass ? studentClass.name : 'Not Assigned'}`);
        doc.text(`Email: ${student.email}`);
        doc.moveDown();
        doc.text(`Total Classes: ${totalClasses}`);
        doc.text(`Classes Attended: ${presentCount}`);
        doc.text(`Attendance Percentage: ${attendancePercentage}%`);
        
        // Add attendance records
        doc.moveDown();
        doc.fontSize(14).text('Attendance History', { underline: true });
        doc.moveDown();
        
        attendanceRecords.forEach(record => {
            const studentRecord = record.students.find(s => s.rollNo === req.user.userId);
            doc.fontSize(10).text(
                `${record.date.toLocaleDateString()} - ${studentRecord && studentRecord.status ? 'Present' : 'Absent'}`
            );
        });

        doc.end();
    } catch (error) {
        console.error('Error generating attendance report:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
});

// Calendar events endpoint
app.get('/api/attendance/calendar', authenticateToken, async (req, res) => {
    try {
        const studentId = req.user.id;
        const attendance = await Attendance.find({ studentId })
            .populate('subjectId', 'name')
            .sort({ date: 1 });

        const events = attendance.map(record => ({
            title: `${record.subjectId.name} - ${record.status}`,
            start: record.date,
            backgroundColor: record.status === 'present' ? '#28a745' : 
                          record.status === 'absent' ? '#dc3545' : '#ffc107',
            textColor: '#fff'
        }));

        res.json(events);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Filtered subject attendance endpoint
app.get('/api/attendance/subjects/filtered', authenticateToken, async (req, res) => {
    try {
        const { subject, month } = req.query;
        const studentId = req.user.id;
        
        let query = { studentId };
        
        if (subject && subject !== 'all') {
            const subjectDoc = await Subject.findOne({ name: subject });
            if (subjectDoc) {
                query.subjectId = subjectDoc._id;
            }
        }
        
        if (month && month !== 'all') {
            const monthIndex = new Date(`${month} 1, 2000`).getMonth();
            query.date = {
                $gte: new Date(new Date().getFullYear(), monthIndex, 1),
                $lt: new Date(new Date().getFullYear(), monthIndex + 1, 1)
            };
        }

        const attendance = await Attendance.find(query)
            .populate('subjectId', 'name')
            .sort({ date: -1 });

        const subjects = {};
        attendance.forEach(record => {
            const subjectName = record.subjectId.name;
            if (!subjects[subjectName]) {
                subjects[subjectName] = {
                    name: subjectName,
                    present: 0,
                    total: 0
                };
            }
            subjects[subjectName].total++;
            if (record.status === 'present') {
                subjects[subjectName].present++;
            }
        });

        const result = Object.values(subjects).map(subject => ({
            ...subject,
            percentage: ((subject.present / subject.total) * 100).toFixed(2)
        }));

        res.json({ success: true, subjects: result });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Upcoming classes endpoint
app.get('/api/classes/upcoming', authenticateToken, async (req, res) => {
    try {
        const student = await User.findById(req.user.id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const classes = await Class.find({
            class: student.class,
            section: student.section,
            date: { $gte: today }
        })
        .populate('subjectId', 'name')
        .sort({ date: 1 })
        .limit(10);

        const formattedClasses = classes.map(cls => ({
            subject: cls.subjectId.name,
            date: cls.date,
            type: cls.type,
            teacher: cls.teacher
        }));

        res.json({ success: true, classes: formattedClasses });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Leave request endpoint
app.post('/api/leave/request', authenticateToken, async (req, res) => {
    try {
        const { date, duration, reason, class: className, emergencyContact } = req.body;
        
        // Validate input
        if (!date || !duration || !reason || !className || !emergencyContact) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Validate duration
        if (duration < 1 || duration > 30) {
            return res.status(400).json({
                success: false,
                message: 'Duration must be between 1 and 30 days'
            });
        }

        // Validate emergency contact
        if (!/^[0-9]{10}$/.test(emergencyContact)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid emergency contact number'
            });
        }

        // Check if user is a student
        if (req.user.role !== 'student') {
            return res.status(403).json({
                success: false,
                message: 'Only students can submit leave requests'
            });
        }

        // Check if leave request already exists for the date range
        const existingLeave = await LeaveRequest.findOne({
            studentId: req.user.userId,
            date: new Date(date),
            status: { $in: ['pending', 'approved'] }
        });

        if (existingLeave) {
            return res.status(400).json({
                success: false,
                message: 'Leave request already exists for this date'
            });
        }

        // Create new leave request
        const leaveRequest = new LeaveRequest({
            studentId: req.user.userId,
            date: new Date(date),
            duration,
            class: className,
            reason,
            emergencyContact,
            status: 'pending'
        });

        await leaveRequest.save();

        // Get student details for notification
        const student = await User.findById(req.user.userId);

        // Notify staff members
        const staffMembers = await User.find({ role: 'staff' });
        const notifications = staffMembers.map(staff => ({
            userId: staff._id,
            type: 'leave_request',
            message: `New leave request from ${student.name} (${className}) for ${duration} day(s) starting ${new Date(date).toLocaleDateString()}`,
            data: {
                leaveRequestId: leaveRequest._id,
                studentId: req.user.userId,
                studentName: student.name,
                class: className,
                date,
                duration
            }
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        res.json({
            success: true,
            message: 'Leave request submitted successfully',
            request: {
                id: leaveRequest._id,
                date: leaveRequest.date,
                duration: leaveRequest.duration,
                class: leaveRequest.class,
                reason: leaveRequest.reason,
                status: leaveRequest.status
            }
        });
    } catch (error) {
        console.error('Error submitting leave request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit leave request',
            error: error.message
        });
    }
});

// Get student's leave requests
app.get('/api/leave/my-requests', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Students only.'
            });
        }

        const requests = await LeaveRequest.find({ studentId: req.user.userId })
            .sort({ date: -1 });

        res.json({
            success: true,
            requests: requests.map(request => ({
                id: request._id,
                date: request.date,
                duration: request.duration,
                class: request.class,
                reason: request.reason,
                status: request.status
            }))
        });
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leave requests'
        });
    }
});

// Timetable endpoint
app.get('/api/timetable', authenticateToken, async (req, res) => {
    try {
        const student = await User.findById(req.user.userId);
        const timetable = await Timetable.findOne({
            class: student.class,
            section: student.section
        });

        if (!timetable) {
            return res.json({ success: true, timetable: [] });
        }

        res.json({ success: true, timetable: timetable.slots });
    } catch (error) {
        console.error('Error fetching timetable:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Study materials endpoint
app.get('/api/study-materials', authenticateToken, async (req, res) => {
    try {
        const student = await User.findById(req.user.userId);
        const materials = await StudyMaterial.find({
            $or: [
                { class: student.class },
                { class: 'all' }
            ]
        }).sort({ createdAt: -1 });

        res.json({ success: true, materials });
    } catch (error) {
        console.error('Error fetching study materials:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Performance metrics endpoint
app.get('/api/performance', authenticateToken, async (req, res) => {
    try {
        const student = await User.findById(req.user.userId);
        
        // Get attendance performance
        const attendanceRecords = await Attendance.find({
            'students.rollNo': student.rollNo
        }).sort({ date: 1 });

        const attendancePercentage = attendanceRecords.length > 0 ? 
            (attendanceRecords.filter(r => r.students.find(s => s.rollNo === student.rollNo).status).length / 
            attendanceRecords.length * 100).toFixed(2) : 0;

        // Get test scores
        const testScores = await TestScore.find({
            studentId: student._id
        }).sort({ date: 1 });

        const averageScore = testScores.length > 0 ? 
            (testScores.reduce((sum, score) => sum + score.score, 0) / testScores.length).toFixed(2) : 0;

        // Get assignment completion
        const assignments = await Assignment.find({
            class: student.class
        });

        const completedAssignments = await AssignmentSubmission.countDocuments({
            studentId: student._id,
            status: 'completed'
        });

        const completionRate = assignments.length > 0 ? 
            ((completedAssignments / assignments.length) * 100).toFixed(2) : 0;

        // Prepare performance metrics
        const metrics = [
            {
                title: 'Attendance',
                value: `${attendancePercentage}%`,
                description: 'Overall attendance percentage'
            },
            {
                title: 'Test Scores',
                value: `${averageScore}%`,
                description: 'Average test performance'
            },
            {
                title: 'Assignments',
                value: `${completionRate}%`,
                description: 'Assignment completion rate'
            }
        ];

        // Prepare chart data
        const chartData = {
            labels: testScores.map(score => score.date.toLocaleDateString()),
            values: testScores.map(score => score.score)
        };

        res.json({
            success: true,
            metrics,
            chartData
        });
    } catch (error) {
        console.error('Error fetching performance metrics:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Notifications endpoint
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const notifications = await Notification.find({
            userId: req.user.userId,
            read: false
        }).sort({ createdAt: -1 });

        res.json({ success: true, notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Mark notification as read
app.post('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, {
            read: true
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Student Classes endpoint
app.get('/api/student/classes', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
        }

        // Find all classes where the student is enrolled
        const classes = await Class.find({
            students: req.user.userId
        }).select('name teacher');

        // Get attendance statistics for each class
        const classesWithStats = await Promise.all(classes.map(async (cls) => {
            const attendance = await Attendance.find({
                classId: cls._id,
                'students.rollNo': req.user.userId
            });

            const totalClasses = attendance.length;
            const presentCount = attendance.filter(record => 
                record.students.find(s => 
                    s.rollNo === req.user.userId && s.status
                )
            ).length;

            return {
                _id: cls._id,
                name: cls.name,
                teacher: cls.teacher,
                stats: {
                    total: totalClasses,
                    present: presentCount,
                    percentage: totalClasses > 0 ? 
                        ((presentCount / totalClasses) * 100).toFixed(2) : 0
                }
            };
        }));

        res.json({ 
            success: true, 
            classes: classesWithStats 
        });
    } catch (error) {
        console.error('Error fetching student classes:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Class attendance endpoint
app.get('/api/attendance/class/:classId', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
        }

        const { classId } = req.params;

        // Verify student is enrolled in the class
        const isEnrolled = await Class.exists({
            _id: classId,
            students: req.user.userId
        });

        if (!isEnrolled) {
            return res.status(403).json({ 
                success: false, 
                message: 'You are not enrolled in this class' 
            });
        }

        // Get attendance records for the class
        const attendance = await Attendance.find({
            classId,
            'students.rollNo': req.user.userId
        }).sort({ date: 1 });

        const totalClasses = attendance.length;
        const presentCount = attendance.filter(record => 
            record.students.find(s => 
                s.rollNo === req.user.userId && s.status
            )
        ).length;

        // Format attendance data for response
        const attendanceData = attendance.map(record => {
            const studentRecord = record.students.find(s => 
                s.rollNo === req.user.userId
            );
            return {
                date: record.date,
                status: studentRecord ? studentRecord.status : false
            };
        });

        res.json({
            success: true,
            attendance: {
                total: totalClasses,
                present: presentCount,
                percentage: totalClasses > 0 ? 
                    ((presentCount / totalClasses) * 100).toFixed(2) : 0,
                data: attendanceData
            }
        });
    } catch (error) {
        console.error('Error fetching class attendance:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Staff marked attendance endpoint
app.get('/api/attendance/staff-marked', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
        }

        // Get student's class
        const studentClass = await Class.findOne({ students: req.user.userId });
        if (!studentClass) {
            return res.json({ success: true, attendance: [] });
        }

        // Get attendance records with staff information
        const attendanceRecords = await Attendance.find({
            classId: studentClass._id,
            'students.rollNo': req.user.userId
        })
        .populate('staffId', 'name')
        .sort({ date: -1 })
        .limit(10);

        const formattedAttendance = attendanceRecords.map(record => {
            const studentRecord = record.students.find(s => s.rollNo === req.user.userId);
            return {
                date: record.date,
                status: studentRecord ? studentRecord.status : false,
                staffName: record.staffId ? record.staffId.name : 'Staff',
                className: studentClass.name,
                markedBy: record.staffId ? record.staffId.name : 'Staff'
            };
        });

        res.json({
            success: true,
            attendance: formattedAttendance
        });
    } catch (error) {
        console.error('Error fetching staff-marked attendance:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get all leave requests (for staff)
app.get('/api/leave/requests', authenticateToken, async (req, res) => {
    try {
        // Check if user is staff
        if (req.user.role !== 'staff') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Staff only.'
            });
        }

        const requests = await LeaveRequest.find()
            .populate('studentId', 'name')
            .sort({ date: -1 });

        const formattedRequests = requests.map(request => ({
            _id: request._id,
            date: request.date,
            studentName: request.studentId.name,
            reason: request.reason,
            status: request.status
        }));

        res.json({
            success: true,
            requests: formattedRequests
        });
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Update leave request status (for staff)
app.put('/api/leave/request/:id', authenticateToken, async (req, res) => {
    try {
        // Check if user is staff
        if (req.user.role !== 'staff') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Staff only.'
            });
        }

        const { id } = req.params;
        const { status } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const request = await LeaveRequest.findByIdAndUpdate(
            id,
            {
                status,
                updatedBy: req.user.id,
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Leave request not found'
            });
        }

        // Notify student about the status update
        const notification = new Notification({
            userId: request.studentId,
            type: 'leave_request_update',
            message: `Your leave request for ${new Date(request.date).toLocaleDateString()} has been ${status}`,
            data: {
                leaveRequestId: request._id,
                status: status
            }
        });

        await notification.save();

        res.json({
            success: true,
            message: `Leave request ${status} successfully`
        });
    } catch (error) {
        console.error('Error updating leave request:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
}); 