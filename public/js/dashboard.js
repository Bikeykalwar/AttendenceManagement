document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidebar toggle
    document.getElementById('sidebarCollapse').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('active');
    });

    // Initialize current date and time
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Load initial dashboard data
    loadDashboardData();

    // Add active class to current nav item
    const navItems = document.querySelectorAll('#sidebar ul li a');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(i => i.parentElement.classList.remove('active'));
            this.parentElement.classList.add('active');
        });
    });
});

// Update date and time
function updateDateTime() {
    const now = new Date();
    const dateTimeString = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
    document.getElementById('currentDateTime').textContent = dateTimeString;
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const response = await fetch('/api/dashboard/stats');
        const data = await response.json();
        
        if (data.success) {
            updateDashboardStats(data);
            updateRecentAttendance(data.recentAttendance);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data');
    }
}

// Update dashboard statistics
function updateDashboardStats(data) {
    document.getElementById('totalStudents').textContent = data.totalStudents || 0;
    document.getElementById('presentToday').textContent = data.presentToday || 0;
    document.getElementById('absentToday').textContent = data.absentToday || 0;
    document.getElementById('lateToday').textContent = data.lateToday || 0;
}

// Update recent attendance table
function updateRecentAttendance(attendance) {
    const tbody = document.querySelector('#recentAttendanceTable tbody');
    tbody.innerHTML = '';

    if (attendance && attendance.length > 0) {
        attendance.forEach(record => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${record.studentName}</td>
                <td>${new Date(record.date).toLocaleDateString()}</td>
                <td>
                    <span class="badge badge-${record.status.toLowerCase()}">
                        ${record.status}
                    </span>
                </td>
                <td>${new Date(record.date).toLocaleTimeString()}</td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No recent attendance records</td></tr>';
    }
}

// Show different sections
function showSection(sectionName) {
    // Hide all sections
    const sections = ['dashboard', 'markAttendance', 'viewAttendance', 'reports', 'profile'];
    sections.forEach(section => {
        document.getElementById(section + 'Section').classList.add('d-none');
    });

    // Show selected section
    document.getElementById(sectionName + 'Section').classList.remove('d-none');

    // Load section specific data
    switch(sectionName) {
        case 'markAttendance':
            loadMarkAttendanceSection();
            break;
        case 'viewAttendance':
            loadViewAttendanceSection();
            break;
        case 'reports':
            loadReportsSection();
            break;
        case 'profile':
            loadProfileSection();
            break;
        default:
            loadDashboardData();
    }
}

// Load Mark Attendance Section
async function loadMarkAttendanceSection() {
    const section = document.getElementById('markAttendanceSection');
    section.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">Mark Attendance</h5>
            </div>
            <div class="card-body">
                <form id="markAttendanceForm">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label">Class/Section</label>
                            <select class="form-select" id="classSelect" required>
                                <option value="">Select Class</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Date</label>
                            <input type="date" class="form-control" id="attendanceDate" required>
                        </div>
                    </div>
                    <div id="studentsList" class="mt-4">
                        <!-- Student list will be populated here -->
                    </div>
                </form>
            </div>
        </div>
    `;

    // Set default date to today
    document.getElementById('attendanceDate').valueAsDate = new Date();

    // Load classes and students
    try {
        const response = await fetch('/api/classes');
        const data = await response.json();
        if (data.success) {
            const classSelect = document.getElementById('classSelect');
            data.classes.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.id;
                option.textContent = cls.name;
                classSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading classes:', error);
        showError('Failed to load classes');
    }
}

// Load View Attendance Section
function loadViewAttendanceSection() {
    const section = document.getElementById('viewAttendanceSection');
    section.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">View Attendance Records</h5>
            </div>
            <div class="card-body">
                <div class="row mb-3">
                    <div class="col-md-4">
                        <label class="form-label">Class/Section</label>
                        <select class="form-select" id="viewClassSelect">
                            <option value="">All Classes</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Date Range</label>
                        <input type="date" class="form-control" id="startDate">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">&nbsp;</label>
                        <input type="date" class="form-control" id="endDate">
                    </div>
                </div>
                <div class="table-responsive">
                    <table class="table" id="attendanceRecordsTable">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Class</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Marked By</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Records will be populated here -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show';
    errorDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('#content').insertAdjacentElement('afterbegin', errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Show success message
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success alert-dismissible fade show';
    successDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('#content').insertAdjacentElement('afterbegin', successDiv);
    setTimeout(() => successDiv.remove(), 5000);
}

// Check if user is logged in
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    // Get student information
    fetch('/api/auth/me', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('studentName').textContent = data.user.name;
            loadTodayAttendance();
            loadAttendanceHistory();
        } else {
            window.location.href = '/';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        window.location.href = '/';
    });
});

// Load today's attendance
function loadTodayAttendance() {
    const token = localStorage.getItem('token');
    fetch('/api/attendance/today', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const statusElement = document.getElementById('attendanceStatus');
            const buttonElement = document.getElementById('markAttendanceBtn');
            
            if (data.attendance) {
                statusElement.textContent = data.attendance.status;
                statusElement.className = `display-4 text-${data.attendance.status === 'present' ? 'success' : 'danger'}`;
                buttonElement.disabled = true;
                buttonElement.textContent = 'Already Marked';
            } else {
                statusElement.textContent = 'Not Marked';
                statusElement.className = 'display-4 text-warning';
                buttonElement.disabled = false;
                buttonElement.textContent = 'Mark Attendance';
            }
        }
    });
}

// Mark attendance
function markAttendance() {
    const token = localStorage.getItem('token');
    fetch('/api/attendance/mark', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            status: 'present'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadTodayAttendance();
            loadAttendanceHistory();
        } else {
            alert(data.message || 'Failed to mark attendance');
        }
    });
}

// Load attendance history
function loadAttendanceHistory(startDate = null, endDate = null) {
    const token = localStorage.getItem('token');
    let url = '/api/attendance/history';
    if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
    }

    fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const tbody = document.getElementById('attendanceHistory');
            tbody.innerHTML = '';
            
            data.attendance.forEach(record => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${new Date(record.date).toLocaleDateString()}</td>
                    <td><span class="badge bg-${record.status === 'present' ? 'success' : 'danger'}">${record.status}</span></td>
                    <td>${record.class}</td>
                    <td>${record.remarks || '-'}</td>
                `;
                tbody.appendChild(row);
            });
        }
    });
}

// Filter attendance history
function filterAttendance() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (startDate && endDate) {
        loadAttendanceHistory(startDate, endDate);
    } else {
        alert('Please select both start and end dates');
    }
}

// Function to fetch and display staff-marked attendance
async function fetchStaffMarkedAttendance() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/attendance/staff-marked', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch staff-marked attendance');
        }

        const data = await response.json();
        const tbody = document.querySelector('#staffMarkedAttendance tbody');
        
        if (data.attendance && data.attendance.length > 0) {
            tbody.innerHTML = data.attendance.map(record => `
                <tr>
                    <td>${new Date(record.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}</td>
                    <td>${record.class}</td>
                    <td>
                        <span class="badge bg-${record.status ? 'success' : 'danger'}">
                            ${record.status ? 'Present' : 'Absent'}
                        </span>
                    </td>
                    <td>${record.markedBy}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No staff-marked attendance records found</td></tr>';
        }
    } catch (error) {
        console.error('Error fetching staff-marked attendance:', error);
        const tbody = document.querySelector('#staffMarkedAttendance tbody');
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Error loading attendance records</td></tr>';
    }
}

// Update the refreshDashboardData function to include staff-marked attendance
async function refreshDashboardData() {
    try {
        await Promise.all([
            fetchAttendanceStats(),
            fetchRecentAttendance(),
            fetchStaffMarkedAttendance(),
            fetchUpcomingClasses()
        ]);
    } catch (error) {
        console.error('Error refreshing dashboard data:', error);
    }
}

// Set up real-time updates
setInterval(() => {
    refreshDashboardData();
}, 30000); // Refresh every 30 seconds

// Initial data load
refreshDashboardData();

// Handle leave request submission
document.getElementById('leaveRequestForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const leaveDate = document.getElementById('leaveDate').value;
    const leaveReason = document.getElementById('leaveReason').value;
    const leaveClass = document.getElementById('leaveClass').value;
    const leaveDuration = document.getElementById('leaveDuration').value;
    const emergencyContact = document.getElementById('emergencyContact').value;

    try {
        const response = await fetch('/api/leave/request', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date: leaveDate,
                reason: leaveReason,
                class: leaveClass,
                duration: leaveDuration,
                emergencyContact: emergencyContact
            })
        });

        const data = await response.json();
        if (data.success) {
            showNotification('Leave request submitted successfully', 'success');
            document.getElementById('leaveRequestForm').reset();
            // Refresh the leave requests display
            loadLeaveRequests();
        } else {
            throw new Error(data.message || 'Failed to submit leave request');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message, 'error');
    }
});

// Load student's leave requests
async function loadLeaveRequests() {
    try {
        const response = await fetch('/api/leave/my-requests', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch leave requests');
        }

        const data = await response.json();
        const leaveHistoryTable = document.getElementById('leaveHistoryTable');
        
        if (leaveHistoryTable) {
            const tbody = leaveHistoryTable.querySelector('tbody');
            tbody.innerHTML = '';

            data.requests.forEach(request => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(request.date).toLocaleDateString()}</td>
                    <td>${request.class}</td>
                    <td>${request.duration} day(s)</td>
                    <td>${request.reason}</td>
                    <td>
                        <span class="badge bg-${getStatusColor(request.status)}">
                            ${request.status}
                        </span>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error loading leave requests:', error);
        showNotification('Failed to load leave requests', 'error');
    }
}

function getStatusColor(status) {
    switch(status.toLowerCase()) {
        case 'approved':
            return 'success';
        case 'rejected':
            return 'danger';
        case 'pending':
            return 'warning';
        default:
            return 'secondary';
    }
}

// Function to update staff marked attendance
async function updateStaffMarkedAttendance() {
    const container = document.querySelector('.staff-attendance-list');
    if (!container) return;

    try {
        const response = await fetch('/api/attendance/staff-marked', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch staff attendance');
        }

        const data = await response.json();

        if (!data.attendance || data.attendance.length === 0) {
            container.innerHTML = '<p>No staff attendance records available</p>';
            return;
        }

        // Simple table for debugging
        let html = '<table border="1" style="width:100%"><tr><th>Date</th><th>Status</th><th>Staff</th><th>Class</th></tr>';
        data.attendance.forEach(record => {
            html += `<tr>
                <td>${new Date(record.date).toLocaleDateString()}</td>
                <td>${record.status ? 'Present' : 'Absent'}</td>
                <td>${record.staffName || record.markedBy || 'Staff'}</td>
                <td>${record.className || record.class || '-'}</td>
            </tr>`;
        });
        html += '</table>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<p>Error loading staff attendance</p>';
    }
}

let socket;

// --- Class Chat Functionality ---
let currentClassRoom = null;
let unreadMessageCount = 0;
let currentUserName = 'student'; // Will be set from profile
let chatInitialized = false;

function updateNotificationBadge() {
    const badge = document.getElementById('notificationCount');
    if (badge) {
        badge.textContent = unreadMessageCount;
        badge.style.display = unreadMessageCount > 0 ? 'inline-block' : 'none';
    }
}

function isChatOpen() {
    const chatContainer = document.getElementById('chatContainer');
    return chatContainer && chatContainer.style.display !== 'none';
}

function openChat() {
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
        chatContainer.style.display = 'block';
        unreadMessageCount = 0;
        updateNotificationBadge();
        // Focus input
        const chatInput = document.getElementById('chatInput');
        if (chatInput) chatInput.focus();
    }
}

function closeChat() {
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
        chatContainer.style.display = 'none';
    }
}

// Attach openChat to the bell icon
const bell = document.querySelector('.notification-bell');
if (bell) bell.onclick = openChat;

// Attach closeChat to the close button in chat
const chatCloseBtn = document.querySelector('#chatContainer .chat-header button');
if (chatCloseBtn) chatCloseBtn.onclick = closeChat;

function setupClassChat() {
    if (chatInitialized) return; // Prevent duplicate listeners
    chatInitialized = true;
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.querySelector('.chat-input button');
    const chatMessages = document.getElementById('chatMessages');

    // Show empty message if no messages
    function checkEmptyChat() {
        if (chatMessages && chatMessages.children.length === 0) {
            chatMessages.innerHTML = '<div class="chat-empty">No messages yet. Start the conversation!</div>';
        }
    }

    // Send message on button click or Enter key
    function sendMessage() {
        const message = chatInput.value.trim();
        if (!message || !currentClassRoom) return;
        socket.emit('classMessage', {
            room: currentClassRoom,
            message,
            sender: currentUserName,
            timestamp: new Date().toISOString()
        });
        chatInput.value = '';
    }

    sendButton.onclick = sendMessage;
    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') sendMessage();
    });

    socket.on('classMessage', (data) => {
        appendChatMessage(data);
        // Only increment badge if message is not from current user and chat is closed
        if (data.sender !== currentUserName && !isChatOpen()) {
            unreadMessageCount++;
            updateNotificationBadge();
        }
    });

    checkEmptyChat();
}

function appendChatMessage(data) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    // Remove empty message if present
    if (chatMessages.querySelector('.chat-empty')) {
        chatMessages.innerHTML = '';
    }
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message' + (data.sender === currentUserName ? ' chat-message-self' : '');
    msgDiv.innerHTML = `<strong>${data.sender}:</strong> ${data.message} <span class="timestamp">${new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function initializeSocketAndJoinClass() {
    socket = io();

    socket.on('attendanceUpdate', (data) => {
        updateStaffMarkedAttendance();
        showNotification('Attendance updated by staff!', 'success');
    });

    socket.on('classMessage', (data) => {
        appendChatMessage(data);
        if (data.sender !== currentUserName && !isChatOpen()) {
            unreadMessageCount++;
            updateNotificationBadge();
        }
    });

    // Join the student's class room with the correct room name and get user name
    fetch('/api/student/profile', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => {
        if (data.class) {
            currentClassRoom = `class_${data.class}`;
            socket.emit('joinClass', currentClassRoom);
            currentUserName = data.name || 'student';
            setupClassChat();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateStaffMarkedAttendance();
    initializeSocketAndJoinClass();
    // ...other initializations...
});

// Stub for downloadReport to prevent ReferenceError
function downloadReport() {
    alert('Download report feature is not implemented yet.');
}

// Example: Add error logging to fetchStudentData (and similar functions)
async function fetchStudentData() {
    try {
        const response = await fetch('/api/student/profile', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) {
            throw new Error('Failed to fetch student profile');
        }
        const data = await response.json();
        // ... handle data ...
    } catch (error) {
        console.error('Error fetching student profile:', error);
    }
} 