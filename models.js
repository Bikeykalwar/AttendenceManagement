// Timetable model
const timetableSchema = new mongoose.Schema({
    class: {
        type: String,
        required: true
    },
    section: {
        type: String,
        required: true
    },
    slots: [{
        day: {
            type: String,
            required: true,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        },
        time: {
            type: String,
            required: true
        },
        subject: {
            type: String,
            required: true
        },
        teacher: {
            type: String,
            required: true
        }
    }]
});

// Study material model
const studyMaterialSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    class: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Test score model
const testScoreSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    testName: {
        type: String,
        required: true
    },
    score: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    date: {
        type: Date,
        required: true
    },
    totalMarks: {
        type: Number,
        required: true
    }
});

// Notification model
const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['info', 'warning', 'success', 'error'],
        default: 'info'
    },
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Export models
module.exports = {
    User,
    Attendance,
    Assignment,
    AssignmentSubmission,
    Timetable: mongoose.model('Timetable', timetableSchema),
    StudyMaterial: mongoose.model('StudyMaterial', studyMaterialSchema),
    TestScore: mongoose.model('TestScore', testScoreSchema),
    Notification: mongoose.model('Notification', notificationSchema)
}; 