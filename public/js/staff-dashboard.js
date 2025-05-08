// Global state to prevent unnecessary re-renders
let currentSection = 'dashboard';
let isLoading = false;
let navigationHistory = ['dashboard'];

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    // Initialize sidebar toggle
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const sidebar = document.getElementById('sidebar');
    
    sidebarCollapse?.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // Initialize current date/time
    updateDateTime();
    setInterval(updateDateTime, 60000); // Update every minute

    // Load initial dashboard data
    await loadDashboardData();

    // Add section change listeners
    document.querySelectorAll('[onclick^="showSection"]').forEach(element => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            const section = element.getAttribute('onclick').match(/'([^']+)'/)[1];
            showSection(section, true);
        });
    });

    // Handle browser back button
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.section) {
            showSection(event.state.section, false);
        }
    });

    // Initialize browser history
    window.history.replaceState({ section: 'dashboard' }, '', '#dashboard');

    // Add request button to the navigation
    const navList = document.querySelector('#navbarNav .navbar-nav');
    if (navList) {
        const requestButton = document.createElement('li');
        requestButton.className = 'nav-item';
        requestButton.innerHTML = `
            <button class="btn btn-outline-light ms-2" onclick="showNewRequestModal()">
                <i class="bi bi-plus-circle"></i> New Request
            </button>
        `;
        navList.insertBefore(requestButton, navList.lastElementChild);
    }
    
    // Add request history section
    const container = document.querySelector('.container');
    if (container) {
        const requestSection = document.createElement('div');
        requestSection.className = 'card mt-4';
        requestSection.innerHTML = `
            <div class="card-header">
                <h5 class="mb-0">My Requests</h5>
            </div>
            <div class="card-body">
                <div id="requestHistory"></div>
            </div>
        `;
        container.appendChild(requestSection);
    }
    
    // Load request history
    loadRequestHistory();

    // Load leave requests
    loadLeaveRequests();
    
    // Refresh data periodically
    setInterval(() => {
        loadLeaveRequests();
    }, 30000); // Refresh every 30 seconds
});

// Navigation functions
function goBack() {
    if (navigationHistory.length > 1) {
        navigationHistory.pop(); // Remove current section
        const previousSection = navigationHistory[navigationHistory.length - 1];
        showSection(previousSection, false);
    }
}

// Debounced function to prevent multiple rapid calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function loadDashboardData() {
    if (isLoading) return;
    isLoading = true;
    
    try {
        showLoadingSpinner();
        const response = await fetch('/api/dashboard/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();

        if (data.success) {
            updateDashboardStats(data);
            updateRecentAttendance(data.recentAttendance);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data');
    } finally {
        hideLoadingSpinner();
        isLoading = false;
    }
}

const debouncedLoadDashboardData = debounce(loadDashboardData, 1000);

function updateDashboardStats(data) {
    document.getElementById('totalStudents').textContent = data.totalStudents;
    document.getElementById('presentToday').textContent = data.presentToday;
    document.getElementById('absentToday').textContent = data.absentToday;
    document.getElementById('lateToday').textContent = data.lateToday;
}

function updateRecentAttendance(attendance) {
    const tbody = document.getElementById('recentAttendanceTable').querySelector('tbody');
    tbody.innerHTML = '';

    attendance.forEach(record => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${record.studentName}</td>
            <td>${new Date(record.date).toLocaleDateString()}</td>
            <td><span class="badge badge-${record.status}">${record.status}</span></td>
            <td>${new Date(record.date).toLocaleTimeString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateDateTime() {
    const dateTimeElement = document.getElementById('currentDateTime');
    if (dateTimeElement) {
        const now = new Date();
        dateTimeElement.textContent = now.toLocaleString();
    }
}

async function showSection(sectionName, addToHistory = true) {
    if (currentSection === sectionName || isLoading) return;
    
    // Update navigation history and back button
    if (addToHistory) {
        navigationHistory.push(sectionName);
        window.history.pushState({ section: sectionName }, '', `#${sectionName}`);
    }
    
    // Show/hide back button
    document.getElementById('backButton').style.display = 
        navigationHistory.length > 1 ? 'block' : 'none';

    // Update breadcrumb
    updateBreadcrumb(sectionName);
    
    // Update active state in sidebar
    document.querySelectorAll('#sidebar .components li').forEach(li => {
        li.classList.remove('active');
    });
    document.querySelector(`#sidebar a[onclick*="${sectionName}"]`)?.parentElement.classList.add('active');

    // Hide all sections with fade effect
    const sections = document.querySelectorAll('.section-content');
    sections.forEach(section => {
        section.style.opacity = '0';
        setTimeout(() => {
            section.classList.add('d-none');
        }, 300);
    });

    // Show selected section with fade effect
    const targetSection = document.getElementById(`${sectionName}Section`);
    if (targetSection) {
        setTimeout(() => {
            targetSection.classList.remove('d-none');
            setTimeout(() => {
                targetSection.style.opacity = '1';
            }, 50);
        }, 300);
        
        // Load section specific data
        if (sectionName === 'dashboard') {
            await debouncedLoadDashboardData();
        } else if (sectionName === 'markAttendance') {
            await loadMarkAttendanceSection();
        } else if (sectionName === 'viewAttendance') {
            await loadViewAttendanceSection();
        } else if (sectionName === 'reports') {
            await loadReportsSection();
        } else if (sectionName === 'profile') {
            await loadProfileSection();
        }
    }

    currentSection = sectionName;
}

function updateBreadcrumb(sectionName) {
    const breadcrumb = document.getElementById('navigationPath');
    const sectionTitle = sectionName.charAt(0).toUpperCase() + sectionName.slice(1).replace(/([A-Z])/g, ' $1');
    
    if (sectionName === 'dashboard') {
        breadcrumb.innerHTML = '<li class="breadcrumb-item active">Dashboard</li>';
    } else {
        breadcrumb.innerHTML = `
            <li class="breadcrumb-item"><a href="#" onclick="showSection('dashboard')">Dashboard</a></li>
            <li class="breadcrumb-item active">${sectionTitle}</li>
        `;
    }
}

function showLoadingSpinner() {
    let spinner = document.querySelector('.spinner-overlay');
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.className = 'spinner-overlay';
        spinner.innerHTML = `
            <div class="spinner-border text-primary spinner" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;
        document.body.appendChild(spinner);
    }
    spinner.style.display = 'flex';
}

function hideLoadingSpinner() {
    const spinner = document.querySelector('.spinner-overlay');
    if (spinner) {
        spinner.style.display = 'none';
    }
}

function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white bg-danger border-0';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    const errorTime = new Date().toLocaleTimeString();
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class='bx bx-error-circle me-2'></i>
                ${message}
                <br>
                <small class="text-white-50">Time: ${errorTime}</small>
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    const container = document.querySelector('.toast-container') || (() => {
        const cont = document.createElement('div');
        cont.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(cont);
        return cont;
    })();
    
    container.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { delay: 5000 });
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}

// Section loading functions (to be implemented based on your needs)
async function loadMarkAttendanceSection() {
    const section = document.getElementById('markAttendanceSection');
    section.innerHTML = `
        <!-- Class Selection Section -->
        <div id="classSelection">
            <h2 class="mb-4">Select Class</h2>
            <div class="row" id="classGrid">
                <!-- Classes will be dynamically added here -->
            </div>
        </div>

        <!-- Class Attendance Section (Initially Hidden) -->
        <div id="classAttendance" style="display: none;">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2 id="selectedClassTitle">Class Attendance</h2>
                <button class="btn btn-secondary" onclick="backToClassSelection()">
                    <i class='bx bx-arrow-back'></i> Back to Classes
                </button>
            </div>

            <!-- Add Student Form -->
            <div class="add-student-form mb-4">
                <h4>Add New Student</h4>
                <form id="addStudentForm" class="row g-3">
                    <div class="col-md-4">
                        <input type="text" class="form-control" id="studentName" placeholder="Student Name" required>
                    </div>
                    <div class="col-md-4">
                        <input type="text" class="form-control" id="studentRoll" placeholder="Roll Number" required>
                    </div>
                    <div class="col-md-4">
                        <button type="submit" class="btn btn-primary">Add Student</button>
                    </div>
                </form>
            </div>

            <!-- Student List -->
            <div class="card">
                <div class="card-header">
                    <div class="row align-items-center">
                        <div class="col">
                            <h5 class="mb-0">Student Attendance</h5>
                        </div>
                        <div class="col-auto">
                            <div class="input-group">
                                <input type="date" class="form-control" id="attendanceDate">
                                <button class="btn btn-primary" onclick="saveAttendance()">Save Attendance</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive student-list">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Roll No</th>
                                    <th>Name</th>
                                    <th>Attendance</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="studentList">
                                <!-- Students will be dynamically added here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize attendance functionality
    initializeAttendance();
}

// Attendance Management Functions
let currentClass = null;

// Initialize classes with unique identifiers and storage
const classes = Array.from({ length: 10 }, (_, i) => {
    const classId = i + 1;
    const storageKey = `class_${classId}_data`;
    const savedData = localStorage.getItem(storageKey);
    return savedData ? JSON.parse(savedData) : {
        id: classId,
        name: `Class ${classId}`,
        students: [],
        uniqueIdentifier: `class_${classId}_${Date.now()}`,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };
});

function generateRandomStudents(count) {
    const firstNames = ['John', 'Emma', 'Michael', 'Sophia', 'William', 'Olivia', 'James', 'Ava', 'Alexander', 'Isabella',
        'Benjamin', 'Mia', 'Lucas', 'Charlotte', 'Henry', 'Amelia', 'Joseph', 'Harper', 'Samuel', 'Evelyn'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
        'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        rollNo: `${i + 1}`.padStart(2, '0'),
        name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
        attendance: null
    }));
}

function initializeAttendance() {
    // Set today's date as default
    const dateInput = document.getElementById('attendanceDate');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
    
    // Initialize class grid
    initializeClassGrid();
    
    // Add form submission handler
    const form = document.getElementById('addStudentForm');
    if (form) {
        form.addEventListener('submit', handleAddStudent);
    }
}

function initializeClassGrid() {
    const classGrid = document.getElementById('classGrid');
    if (classGrid) {
        classGrid.innerHTML = classes.map(classData => `
            <div class="col-md-4 mb-4">
                <div class="card class-card" onclick="selectClass(${classData.id})">
                    <div class="card-body text-center">
                        <h3 class="card-title">${classData.name}</h3>
                        <p class="card-text">${classData.students.length} Students</p>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// Function to save class data to localStorage with proper isolation
function saveClassData() {
    if (!currentClass) return;
    
    const storageKey = `class_${currentClass.id}_data`;
    const dataToSave = {
        ...currentClass,
        lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    
    // Update the class in the classes array
    const classIndex = classes.findIndex(c => c.id === currentClass.id);
    if (classIndex !== -1) {
        classes[classIndex] = dataToSave;
    }
}

// Function to load class data from localStorage
function loadClassData(classId) {
    const storageKey = `class_${classId}_data`;
    const savedData = localStorage.getItem(storageKey);
    return savedData ? JSON.parse(savedData) : null;
}

// Update selectClass function to properly initialize class data
async function selectClass(classId) {
    try {
        showLoadingSpinner();
        
        // Find the class in our classes array
        const selectedClass = classes.find(c => c.id === classId);
        if (!selectedClass) {
            throw new Error('Class not found');
        }

        // Initialize or load saved data for this class
        const storageKey = `class_${classId}_data`;
        const savedData = localStorage.getItem(storageKey);
        
        currentClass = {
            id: classId,
            name: `Class ${classId}`,
            students: [],
            uniqueIdentifier: `class_${classId}_${Date.now()}`,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            ...selectedClass,
            ...(savedData ? JSON.parse(savedData) : {})
        };

        // Ensure required properties exist
        if (!currentClass.students) currentClass.students = [];
        if (!currentClass.uniqueIdentifier) {
            currentClass.uniqueIdentifier = `class_${classId}_${Date.now()}`;
        }

        // Save initial state if new
        if (!savedData) {
            saveClassData();
        }

        // Update UI elements
        document.getElementById('classSelection').style.display = 'none';
        document.getElementById('classAttendance').style.display = 'block';
        document.getElementById('selectedClassTitle').textContent = `${currentClass.name} Attendance`;
        
        // Update class info display
        updateClassInfo();
        
        // Set today's date
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        const dateInput = document.getElementById('attendanceDate');
        if (dateInput) {
            dateInput.value = formattedDate;
        }

        // Load attendance data for today
        await loadAttendanceForDate(formattedDate);
        
        // Update UI
        renderStudentList();
        updateAttendanceStats();
        updateClassGrid();

    } catch (error) {
        console.error('Error loading class:', error);
        showError(`Failed to load class: ${error.message}`);
    } finally {
        hideLoadingSpinner();
    }
}

// Update handleAddStudent to ensure class-specific student IDs
function handleAddStudent(event) {
    event.preventDefault();
    
    if (!currentClass) {
        showError('Please select a class first');
        return;
    }

    const nameInput = document.getElementById('studentName');
    const rollInput = document.getElementById('studentRoll');
    
    const studentName = nameInput.value.trim();
    const rollNumber = rollInput.value.trim();
    
    // Validate inputs
    if (!studentName || !rollNumber) {
        showError('Please fill in both name and roll number');
        return;
    }

    // Check for duplicate roll number in this specific class
    if (currentClass.students.some(s => s.rollNo === rollNumber)) {
        showError(`Roll number ${rollNumber} already exists in ${currentClass.name}`);
        return;
    }
    
    // Create new student with class-specific ID
    const newStudent = {
        id: `${currentClass.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        rollNo: rollNumber,
        name: studentName,
        attendance: null,
        classId: currentClass.id,
        addedAt: new Date().toISOString()
    };
    
    // Add student to current class
    currentClass.students.push(newStudent);
    
    // Save updated class data
    saveClassData();
    
    // Update UI
    renderStudentList();
    updateAttendanceStats();
    updateClassGrid();
    
    // Show success message
    showSuccess(`Added ${studentName} to ${currentClass.name}`);
    
    // Reset form
    nameInput.value = '';
    rollInput.value = '';
}

// Update saveAttendance function validation
async function saveAttendance() {
    if (!currentClass) {
        showError('No class selected');
        return;
    }

    try {
        showLoadingSpinner();
        const dateInput = document.getElementById('attendanceDate');
        
        if (!dateInput || !dateInput.value) {
            throw new Error('Invalid date selected');
        }

        const date = dateInput.value;
        
        // Ensure currentClass has all required properties
        if (!currentClass.id) {
            currentClass.id = parseInt(currentClass.name.split(' ')[1]) || Date.now();
        }
        if (!currentClass.uniqueIdentifier) {
            currentClass.uniqueIdentifier = `class_${currentClass.id}_${Date.now()}`;
        }

        // Prepare attendance data
        const attendanceData = {
            classId: currentClass.id,
            date: date,
            uniqueIdentifier: currentClass.uniqueIdentifier,
            lastUpdated: new Date().toISOString(),
            students: currentClass.students.map(student => ({
                id: student.id || `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                rollNo: student.rollNo,
                name: student.name,
                status: student.attendance
            }))
        };

        // Save to localStorage
        const storageKey = `attendance_${currentClass.id}_${date}`;
        localStorage.setItem(storageKey, JSON.stringify(attendanceData));
        
        // Save class data as well
        saveClassData();

        // Update UI
        const savedRows = document.querySelectorAll('#studentList tr');
        savedRows.forEach(row => {
            row.classList.add('saved-record');
            setTimeout(() => row.classList.remove('saved-record'), 1000);
        });

        showSuccess(`Attendance saved successfully for ${currentClass.name} on ${new Date(date).toLocaleDateString()}`);
        updateAttendanceStats();
        updateClassInfo();

    } catch (error) {
        console.error('Error saving attendance:', error);
        showError(`Failed to save attendance: ${error.message}`);
    } finally {
        hideLoadingSpinner();
    }
}

// Update backToClassSelection to properly reset state
function backToClassSelection() {
    const classSelection = document.getElementById('classSelection');
    const classAttendance = document.getElementById('classAttendance');
    
    if (classSelection && classAttendance) {
        // Save current class data before switching
        if (currentClass) {
            saveClassData();
        }
        
        // Reset current class
        currentClass = null;
        
        // Update UI
        classSelection.style.display = 'block';
        classAttendance.style.display = 'none';
        
        // Refresh class grid to show updated data
        updateClassGrid();
    }
}

// Add CSS for attendance marking and delete animations
const styleElement = document.createElement('style');
styleElement.textContent = `
    .attendance-updated {
        animation: highlightUpdate 0.5s ease;
    }

    @keyframes highlightUpdate {
        0% {
            background-color: rgba(0, 123, 255, 0.1);
        }
        50% {
            background-color: rgba(0, 123, 255, 0.2);
        }
        100% {
            background-color: transparent;
        }
    }

    .fade-out {
        animation: fadeOut 0.5s ease;
        opacity: 0;
    }

    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(-20px);
        }
    }

    .btn-outline-success.active {
        background-color: #28a745;
        color: white;
    }

    .btn-outline-danger.active {
        background-color: #dc3545;
        color: white;
    }

    .attendance-mark {
        transition: transform 0.2s ease;
    }

    .btn:hover .attendance-mark {
        transform: scale(1.2);
    }

    .btn-outline-success:hover {
        background-color: rgba(40, 167, 69, 0.1);
    }

    .btn-outline-danger:hover {
        background-color: rgba(220, 53, 69, 0.1);
    }
`;
document.head.appendChild(styleElement);

// Update the renderStudentList function to include proper button handling
function renderStudentList() {
    const studentList = document.getElementById('studentList');
    if (!studentList || !currentClass) return;

    studentList.innerHTML = currentClass.students.map(student => `
        <tr data-student-id="${student.id}">
            <td>${student.rollNo}</td>
            <td>${student.name}</td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-outline-success ${student.attendance === true ? 'active' : ''}"
                            onclick="markAttendance('${student.id}', true)"
                            title="Mark Present">
                        <i class='bx bx-check attendance-mark'></i>
                    </button>
                    <button class="btn btn-outline-danger ${student.attendance === false ? 'active' : ''}"
                            onclick="markAttendance('${student.id}', false)"
                            title="Mark Absent">
                        <i class='bx bx-x attendance-mark'></i>
                    </button>
                </div>
            </td>
            <td>
                <button class="btn btn-danger btn-sm"
                        onclick="removeStudent('${student.id}')"
                        title="Remove Student">
                    <i class='bx bx-trash'></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function markAttendance(studentId, isPresent) {
    if (!currentClass || !studentId) return;

    try {
        const student = currentClass.students.find(s => s.id === studentId);
        if (!student) {
            showError('Student not found');
            return;
        }

        // Toggle attendance if clicking the same button again
        if (student.attendance === isPresent) {
            student.attendance = null;
        } else {
            student.attendance = isPresent;
        }

        // Update UI immediately
        const row = document.querySelector(`tr[data-student-id="${studentId}"]`);
        if (row) {
            const presentBtn = row.querySelector('.btn-outline-success');
            const absentBtn = row.querySelector('.btn-outline-danger');
            
            // Reset both buttons
            presentBtn.classList.remove('active');
            absentBtn.classList.remove('active');
            
            // Activate the correct button
            if (student.attendance === true) {
                presentBtn.classList.add('active');
            } else if (student.attendance === false) {
                absentBtn.classList.add('active');
            }

            // Add animation effect
            row.classList.add('attendance-updated');
            setTimeout(() => row.classList.remove('attendance-updated'), 500);
        }

        // Save the current state
        saveClassData();
        updateAttendanceStats();

    } catch (error) {
        console.error('Error marking attendance:', error);
        showError('Failed to mark attendance');
    }
}

// Function to remove student with confirmation
async function removeStudent(studentId) {
    if (!currentClass || !studentId) return;

    try {
        const student = currentClass.students.find(s => s.id === studentId);
        if (!student) {
            showError('Student not found');
            return;
        }

        // Show confirmation dialog with student details
        const confirmDelete = confirm(
            `Are you sure you want to remove:\n\n` +
            `Name: ${student.name}\n` +
            `Roll No: ${student.rollNo}\n` +
            `From: ${currentClass.name}\n\n` +
            `This action cannot be undone!`
        );

        if (confirmDelete) {
            // Add fade-out animation
            const row = document.querySelector(`tr[data-student-id="${studentId}"]`);
            if (row) {
                row.classList.add('fade-out');
                // Wait for animation to complete
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Remove student from array
            currentClass.students = currentClass.students.filter(s => s.id !== studentId);
            
            // Save changes
            saveClassData();
            
            // Update UI
            renderStudentList();
            updateAttendanceStats();
            updateClassGrid();
            
            showSuccess(`Removed ${student.name} from ${currentClass.name}`);
        }
    } catch (error) {
        console.error('Error removing student:', error);
        showError('Failed to remove student');
    }
}

// Add CSS for saved record animation
const style = document.createElement('style');
style.textContent = `
    .saved-record {
        animation: saveFlash 1s ease-out;
    }
    
    @keyframes saveFlash {
        0% { background-color: rgba(40, 167, 69, 0.2); }
        100% { background-color: transparent; }
    }
    
    .bx-spin {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Store loaded classes globally for filter dropdown
let loadedClassList = [];

async function loadViewAttendanceSection() {
    const section = document.getElementById('viewAttendanceSection');
    section.innerHTML = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="card-title mb-0">Attendance History</h5>
                <div class="d-flex gap-2">
                    <select class="form-select" id="classFilter" onchange="filterAttendanceHistory()">
                        <option value="">All Classes</option>
                    </select>
                    <input type="date" class="form-control" id="dateFilter" onchange="filterAttendanceHistory()">
                    <button class="btn btn-primary" onclick="filterAttendanceHistory()">
                        <i class='bx bx-filter'></i> Filter
                    </button>
                    <button class="btn btn-success" onclick="exportAttendanceData()">
                        <i class='bx bx-export'></i> Export
                    </button>
                </div>
            </div>
            <div class="card-body">
                <!-- Statistics Cards -->
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card bg-primary text-white">
                            <div class="card-body">
                                <h6 class="card-title">Total Classes</h6>
                                <h3 class="card-text" id="totalClasses">0</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-success text-white">
                            <div class="card-body">
                                <h6 class="card-title">Average Attendance</h6>
                                <h3 class="card-text" id="avgAttendance">0%</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-info text-white">
                            <div class="card-body">
                                <h6 class="card-title">Most Present Class</h6>
                                <h3 class="card-text" id="mostPresentClass">-</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-warning text-white">
                            <div class="card-body">
                                <h6 class="card-title">Least Present Class</h6>
                                <h3 class="card-text" id="leastPresentClass">-</h3>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Attendance Chart -->
                <div class="card mb-4">
                    <div class="card-body">
                        <canvas id="attendanceChart"></canvas>
                    </div>
                </div>

                <!-- Attendance History Table -->
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Class</th>
                                <th>Total Students</th>
                                <th>Present</th>
                                <th>Absent</th>
                                <th>Attendance %</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="attendanceHistoryBody">
                            <!-- History will be populated here -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Load classes for filter
    try {
        const response = await fetch('/api/classes');
        const data = await response.json();
        if (data.success) {
            loadedClassList = data.classes;
            const classFilter = document.getElementById('classFilter');
            classFilter.innerHTML = '<option value="">All Classes</option>';
            loadedClassList.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.id;
                option.textContent = cls.name;
                classFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading classes:', error);
        showError('Failed to load classes');
    }

    // Set default date to today
    document.getElementById('dateFilter').valueAsDate = new Date();

    // Load initial attendance history
    await loadAttendanceHistory();
}

async function loadAttendanceHistory() {
    try {
        showLoadingSpinner();
        const classId = document.getElementById('classFilter').value;
        const date = document.getElementById('dateFilter').value;
        
        // Get all attendance records from localStorage
        const attendanceRecords = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('attendance_')) {
                const record = JSON.parse(localStorage.getItem(key));
                if ((!classId || record.classId === parseInt(classId)) &&
                    (!date || record.date === date)) {
                    attendanceRecords.push(record);
                }
            }
        }

        // Sort records by date
        attendanceRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Update statistics
        updateAttendanceStatistics(attendanceRecords, classId);

        // Update chart
        updateAttendanceChart(attendanceRecords);

        // Update table
        const tbody = document.getElementById('attendanceHistoryBody');
        tbody.innerHTML = attendanceRecords.map(record => {
            const presentCount = record.students.filter(s => s.status === true).length;
            const totalStudents = record.students.length;
            const attendancePercentage = ((presentCount / totalStudents) * 100).toFixed(1);
            const className = loadedClassList.find(cls => cls.id === record.classId)?.name || `Class ${record.classId}`;
            return `
                <tr>
                    <td>${new Date(record.date).toLocaleDateString()}</td>
                    <td>${className}</td>
                    <td>${totalStudents}</td>
                    <td>${presentCount}</td>
                    <td>${totalStudents - presentCount}</td>
                    <td>
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar ${getProgressBarColor(attendancePercentage)}" 
                                 role="progressbar" 
                                 style="width: ${attendancePercentage}%"
                                 aria-valuenow="${attendancePercentage}" 
                                 aria-valuemin="0" 
                                 aria-valuemax="100">
                                ${attendancePercentage}%
                            </div>
                        </div>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="viewAttendanceDetails('${record.uniqueIdentifier}')">
                            <i class='bx bx-detail'></i> Details
                        </button>
                        <button class="btn btn-sm btn-success" onclick="editAttendance('${record.uniqueIdentifier}')">
                            <i class='bx bx-edit'></i> Edit
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading attendance history:', error);
        showError('Failed to load attendance history');
    } finally {
        hideLoadingSpinner();
    }
}

function filterAttendanceHistory() {
    loadAttendanceHistory();
}

function updateAttendanceStatistics(records, classId) {
    if (!records.length) {
        document.getElementById('totalClasses').textContent = '0';
        document.getElementById('avgAttendance').textContent = '0%';
        document.getElementById('mostPresentClass').textContent = '-';
        document.getElementById('leastPresentClass').textContent = '-';
        return;
    }

    // If a specific class is selected, stats are for that class only
    if (classId) {
        document.getElementById('totalClasses').textContent = records.length;
        const totalAttendance = records.reduce((sum, record) => {
            const presentCount = record.students.filter(s => s.status === true).length;
            return sum + (presentCount / record.students.length);
        }, 0);
        const avgAttendance = ((totalAttendance / records.length) * 100).toFixed(1);
        document.getElementById('avgAttendance').textContent = `${avgAttendance}%`;
        const className = loadedClassList.find(cls => cls.id === parseInt(classId))?.name || `Class ${classId}`;
        document.getElementById('mostPresentClass').textContent = className;
        document.getElementById('leastPresentClass').textContent = className;
        return;
    }

    // For all classes, calculate stats across all
    document.getElementById('totalClasses').textContent = records.length;
    const totalAttendance = records.reduce((sum, record) => {
        const presentCount = record.students.filter(s => s.status === true).length;
        return sum + (presentCount / record.students.length);
    }, 0);
    const avgAttendance = ((totalAttendance / records.length) * 100).toFixed(1);
    document.getElementById('avgAttendance').textContent = `${avgAttendance}%`;

    // Find most and least present classes
    const classStats = {};
    records.forEach(record => {
        const presentCount = record.students.filter(s => s.status === true).length;
        const totalStudents = record.students.length;
        const percentage = (presentCount / totalStudents) * 100;
        if (!classStats[record.classId]) {
            classStats[record.classId] = { total: 0, present: 0 };
        }
        classStats[record.classId].total += totalStudents;
        classStats[record.classId].present += presentCount;
    });
    let mostPresent = { classId: null, percentage: -1 };
    let leastPresent = { classId: null, percentage: 101 };
    Object.entries(classStats).forEach(([cid, stats]) => {
        const percentage = (stats.present / stats.total) * 100;
        if (percentage > mostPresent.percentage) {
            mostPresent = { classId: cid, percentage };
        }
        if (percentage < leastPresent.percentage) {
            leastPresent = { classId: cid, percentage };
        }
    });
    document.getElementById('mostPresentClass').textContent = mostPresent.classId ? (loadedClassList.find(cls => cls.id === parseInt(mostPresent.classId))?.name || `Class ${mostPresent.classId}`) : '-';
    document.getElementById('leastPresentClass').textContent = leastPresent.classId ? (loadedClassList.find(cls => cls.id === parseInt(leastPresent.classId))?.name || `Class ${leastPresent.classId}`) : '-';
}

function updateAttendanceChart(records) {
    const ctx = document.getElementById('attendanceChart').getContext('2d');
    
    // Prepare data for chart
    const dates = records.map(r => new Date(r.date).toLocaleDateString());
    const percentages = records.map(r => {
        const presentCount = r.students.filter(s => s.status === true).length;
        return ((presentCount / r.students.length) * 100).toFixed(1);
    });

    // Destroy existing chart if it exists
    if (window.attendanceChart) {
        window.attendanceChart.destroy();
    }

    // Create new chart
    window.attendanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Attendance Percentage',
                data: percentages,
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Attendance Trend'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Attendance: ${context.raw}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Attendance Percentage'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });
}

function getProgressBarColor(percentage) {
    if (percentage >= 90) return 'bg-success';
    if (percentage >= 75) return 'bg-info';
    if (percentage >= 60) return 'bg-warning';
    return 'bg-danger';
}

function exportAttendanceData() {
    const classId = document.getElementById('classFilter').value;
    const date = document.getElementById('dateFilter').value;
    
    // Get filtered records
    const attendanceRecords = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('attendance_')) {
            const record = JSON.parse(localStorage.getItem(key));
            if ((!classId || record.classId === parseInt(classId)) &&
                (!date || record.date === date)) {
                attendanceRecords.push(record);
            }
        }
    }

    // Prepare CSV content
    let csvContent = 'Date,Class,Total Students,Present,Absent,Attendance %\n';
    
    attendanceRecords.forEach(record => {
        const presentCount = record.students.filter(s => s.status === true).length;
        const totalStudents = record.students.length;
        const attendancePercentage = ((presentCount / totalStudents) * 100).toFixed(1);
        
        csvContent += `${new Date(record.date).toLocaleDateString()},Class ${record.classId},${totalStudents},${presentCount},${totalStudents - presentCount},${attendancePercentage}%\n`;
    });

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function editAttendance(uniqueIdentifier) {
    // Find the record
    let record = null;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('attendance_')) {
            const storedRecord = JSON.parse(localStorage.getItem(key));
            if (storedRecord.uniqueIdentifier === uniqueIdentifier) {
                record = storedRecord;
                break;
            }
        }
    }

    if (!record) {
        showError('Attendance record not found');
        return;
    }

    // Create and show modal
    const modalHtml = `
        <div class="modal fade" id="editAttendanceModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Edit Attendance - ${new Date(record.date).toLocaleDateString()}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Roll No</th>
                                        <th>Name</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${record.students.map(student => `
                                        <tr>
                                            <td>${student.rollNo}</td>
                                            <td>${student.name}</td>
                                            <td>
                                                <div class="btn-group" role="group">
                                                    <button class="btn btn-outline-success ${student.status === true ? 'active' : ''}"
                                                            onclick="updateStudentStatus('${uniqueIdentifier}', '${student.id}', true)">
                                                        <i class='bx bx-check'></i> Present
                                                    </button>
                                                    <button class="btn btn-outline-danger ${student.status === false ? 'active' : ''}"
                                                            onclick="updateStudentStatus('${uniqueIdentifier}', '${student.id}', false)">
                                                        <i class='bx bx-x'></i> Absent
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="saveAttendanceChanges('${uniqueIdentifier}')">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('editAttendanceModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add new modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('editAttendanceModal'));
    modal.show();
}

function updateStudentStatus(uniqueIdentifier, studentId, isPresent) {
    // Find the record
    let record = null;
    let recordKey = null;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('attendance_')) {
            const storedRecord = JSON.parse(localStorage.getItem(key));
            if (storedRecord.uniqueIdentifier === uniqueIdentifier) {
                record = storedRecord;
                recordKey = key;
                break;
            }
        }
    }

    if (!record) {
        showError('Attendance record not found');
        return;
    }

    // Update student status
    const student = record.students.find(s => s.id === studentId);
    if (student) {
        student.status = isPresent;
        localStorage.setItem(recordKey, JSON.stringify(record));
        
        // Update UI
        const button = document.querySelector(`button[onclick="updateStudentStatus('${uniqueIdentifier}', '${studentId}', ${isPresent})"]`);
        const parentGroup = button.closest('.btn-group');
        parentGroup.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    }
}

function saveAttendanceChanges(uniqueIdentifier) {
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editAttendanceModal'));
    modal.hide();

    // Reload attendance history
    loadAttendanceHistory();
    showSuccess('Attendance updated successfully');
}

// Add CSS for the enhanced features
const enhancedStyles = document.createElement('style');
enhancedStyles.textContent = `
    .progress {
        background-color: #e9ecef;
        border-radius: 4px;
        margin-bottom: 0;
    }
    .progress-bar {
        color: white;
        font-weight: 500;
        text-shadow: 1px 1px 1px rgba(0,0,0,0.2);
    }
    .btn-group .btn {
        padding: 0.25rem 0.5rem;
    }
    .btn-group .btn.active {
        color: white;
    }
    .btn-group .btn-outline-success.active {
        background-color: #198754;
    }
    .btn-group .btn-outline-danger.active {
        background-color: #dc3545;
    }
    .table td {
        vertical-align: middle;
    }
    #attendanceChart {
        min-height: 300px;
    }
`;
document.head.appendChild(enhancedStyles);

function updateAttendanceStatistics(records, classId) {
    if (!records.length) {
        document.getElementById('totalClasses').textContent = '0';
        document.getElementById('avgAttendance').textContent = '0%';
        document.getElementById('mostPresentClass').textContent = '-';
        document.getElementById('leastPresentClass').textContent = '-';
        return;
    }

    // If a specific class is selected, stats are for that class only
    if (classId) {
        document.getElementById('totalClasses').textContent = records.length;
        const totalAttendance = records.reduce((sum, record) => {
            const presentCount = record.students.filter(s => s.status === true).length;
            return sum + (presentCount / record.students.length);
        }, 0);
        const avgAttendance = ((totalAttendance / records.length) * 100).toFixed(1);
        document.getElementById('avgAttendance').textContent = `${avgAttendance}%`;
        const className = loadedClassList.find(cls => cls.id === parseInt(classId))?.name || `Class ${classId}`;
        document.getElementById('mostPresentClass').textContent = className;
        document.getElementById('leastPresentClass').textContent = className;
        return;
    }

    // For all classes, calculate stats across all
    document.getElementById('totalClasses').textContent = records.length;
    const totalAttendance = records.reduce((sum, record) => {
        const presentCount = record.students.filter(s => s.status === true).length;
        return sum + (presentCount / record.students.length);
    }, 0);
    const avgAttendance = ((totalAttendance / records.length) * 100).toFixed(1);
    document.getElementById('avgAttendance').textContent = `${avgAttendance}%`;

    // Find most and least present classes
    const classStats = {};
    records.forEach(record => {
        const presentCount = record.students.filter(s => s.status === true).length;
        const totalStudents = record.students.length;
        const percentage = (presentCount / totalStudents) * 100;
        if (!classStats[record.classId]) {
            classStats[record.classId] = { total: 0, present: 0 };
        }
        classStats[record.classId].total += totalStudents;
        classStats[record.classId].present += presentCount;
    });
    let mostPresent = { classId: null, percentage: -1 };
    let leastPresent = { classId: null, percentage: 101 };
    Object.entries(classStats).forEach(([cid, stats]) => {
        const percentage = (stats.present / stats.total) * 100;
        if (percentage > mostPresent.percentage) {
            mostPresent = { classId: cid, percentage };
        }
        if (percentage < leastPresent.percentage) {
            leastPresent = { classId: cid, percentage };
        }
    });
    document.getElementById('mostPresentClass').textContent = mostPresent.classId ? (loadedClassList.find(cls => cls.id === parseInt(mostPresent.classId))?.name || `Class ${mostPresent.classId}`) : '-';
    document.getElementById('leastPresentClass').textContent = leastPresent.classId ? (loadedClassList.find(cls => cls.id === parseInt(leastPresent.classId))?.name || `Class ${leastPresent.classId}`) : '-';
}

async function viewAttendanceDetails(uniqueIdentifier) {
    // Find the record
    let record = null;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('attendance_')) {
            const storedRecord = JSON.parse(localStorage.getItem(key));
            if (storedRecord.uniqueIdentifier === uniqueIdentifier) {
                record = storedRecord;
                break;
            }
        }
    }

    if (!record) {
        showError('Attendance record not found');
        return;
    }

    // Create and show modal
    const modalHtml = `
        <div class="modal fade" id="attendanceDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Attendance Details - ${new Date(record.date).toLocaleDateString()}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Roll No</th>
                                        <th>Name</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${record.students.map(student => `
                                        <tr>
                                            <td>${student.rollNo}</td>
                                            <td>${student.name}</td>
                                            <td>
                                                <span class="badge bg-${student.status ? 'success' : 'danger'}">
                                                    ${student.status ? 'Present' : 'Absent'}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('attendanceDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add new modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('attendanceDetailsModal'));
    modal.show();
}

async function loadReportsSection() {
    // Implementation for loading reports section
}

async function loadProfileSection() {
    // Implementation for loading profile section
}

function updateAttendanceStats() {
    if (!currentClass) return;

    const totalStudents = currentClass.students.length;
    const presentStudents = currentClass.students.filter(s => s.attendance === true).length;
    const absentStudents = currentClass.students.filter(s => s.attendance === false).length;
    const unmarkedStudents = currentClass.students.filter(s => s.attendance === null).length;

    // Create or update stats container
    let statsContainer = document.querySelector('.attendance-stats');
    if (!statsContainer) {
        statsContainer = document.createElement('div');
        statsContainer.className = 'attendance-stats card mt-3 mb-4';
        const cardHeader = document.getElementById('classAttendance').querySelector('.card-header');
        cardHeader.parentNode.insertBefore(statsContainer, cardHeader);
    }

    statsContainer.innerHTML = `
        <div class="card-body">
            <div class="row text-center">
                <div class="col-md-3">
                    <h5 class="text-primary mb-0">${totalStudents}</h5>
                    <small class="text-muted">Total Students</small>
                </div>
                <div class="col-md-3">
                    <h5 class="text-success mb-0">${presentStudents}</h5>
                    <small class="text-muted">Present</small>
                </div>
                <div class="col-md-3">
                    <h5 class="text-danger mb-0">${absentStudents}</h5>
                    <small class="text-muted">Absent</small>
                </div>
                <div class="col-md-3">
                    <h5 class="text-warning mb-0">${unmarkedStudents}</h5>
                    <small class="text-muted">Unmarked</small>
                </div>
            </div>
        </div>
    `;
}

// Add some CSS for the stats
const statsStyle = document.createElement('style');
statsStyle.textContent = `
    .attendance-stats {
        background: #f8f9fa;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .attendance-stats h5 {
        font-size: 1.5rem;
        font-weight: 600;
    }
    .attendance-stats small {
        font-size: 0.875rem;
    }
    .attendance-stats .col-md-3 {
        padding: 1rem;
        border-right: 1px solid #dee2e6;
    }
    .attendance-stats .col-md-3:last-child {
        border-right: none;
    }
`;
document.head.appendChild(statsStyle);

function updateClassGrid() {
    const classGrid = document.getElementById('classGrid');
    if (!classGrid) return;

    classGrid.innerHTML = classes.map(classData => `
        <div class="col-md-4 mb-4">
            <div class="card class-card" onclick="selectClass(${classData.id})">
                <div class="card-body text-center">
                    <h3 class="card-title">${classData.name}</h3>
                    <p class="card-text">${classData.students.length} Students</p>
                    <small class="text-muted">Last updated: ${
                        classData.lastUpdated ? 
                        new Date(classData.lastUpdated).toLocaleDateString() : 
                        'Never'
                    }</small>
                </div>
            </div>
        </div>
    `).join('');
}

// Update the updateClassInfo function
function updateClassInfo() {
    if (!currentClass) return;

    let classInfoContainer = document.querySelector('.class-info');
    if (!classInfoContainer) {
        const container = document.createElement('div');
        container.className = 'class-info card mb-4';
        container.innerHTML = `
            <div class="card-body">
                <button class="btn btn-info info-button" onclick="showClassInformation()">
                    <i class='bx bx-info-circle'></i> Class Information
                </button>
                <h4 class="card-title">${currentClass.name}</h4>
                <div class="row">
                    <div class="col-md-6">
                        <p class="mb-1" id="totalStudentsInfo">Total Students: ${currentClass.students.length}</p>
                        <p class="mb-1" id="classIdInfo">Class ID: ${currentClass.id}</p>
                    </div>
                    <div class="col-md-6">
                        <p class="mb-1" id="lastUpdatedInfo">Last Updated: ${new Date(currentClass.lastUpdated || Date.now()).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        `;
        const targetElement = document.getElementById('classAttendance');
        if (targetElement) {
            targetElement.insertBefore(container, targetElement.firstChild);
        }
    } else {
        // Update existing container
        const titleElement = classInfoContainer.querySelector('.card-title');
        const totalStudentsElement = document.getElementById('totalStudentsInfo');
        const lastUpdatedElement = document.getElementById('lastUpdatedInfo');
        
        if (titleElement) titleElement.textContent = currentClass.name;
        if (totalStudentsElement) totalStudentsElement.textContent = `Total Students: ${currentClass.students.length}`;
        if (lastUpdatedElement) lastUpdatedElement.textContent = `Last Updated: ${new Date(currentClass.lastUpdated || Date.now()).toLocaleString()}`;
    }
}

// Add function to load attendance for specific date
async function loadAttendanceForDate(date) {
    if (!currentClass || !date) return;

    try {
        // Try to load from localStorage first
        const storageKey = `attendance_${currentClass.id}_${date}`;
        const savedData = localStorage.getItem(storageKey);
        
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            
            // Verify the data belongs to the current class
            if (parsedData.classId === currentClass.id && 
                parsedData.uniqueIdentifier === currentClass.uniqueIdentifier) {
                
                // Update student attendance states
                currentClass.students = currentClass.students.map(student => {
                    const savedStudent = parsedData.students.find(s => s.rollNo === student.rollNo);
                    return {
                        ...student,
                        attendance: savedStudent ? savedStudent.status : null
                    };
                });

                // Update UI
                renderStudentList();
                updateAttendanceStats();
                return;
            }
        }

        // If no valid local data, reset attendance states
        currentClass.students = currentClass.students.map(student => ({
            ...student,
            attendance: null
        }));
        
        renderStudentList();
        updateAttendanceStats();

    } catch (error) {
        console.error('Error loading attendance:', error);
        showError('Failed to load attendance data');
    }
}

// Add event listener for date changes
document.getElementById('attendanceDate')?.addEventListener('change', (event) => {
    loadAttendanceForDate(event.target.value);
});

// Add some CSS for the class info
const classInfoStyle = document.createElement('style');
classInfoStyle.textContent = `
    .class-info {
        background: linear-gradient(to right, #f8f9fa, #e9ecef);
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .class-info .card-title {
        color: #2c3e50;
        font-weight: 600;
    }
    .class-info p {
        margin-bottom: 0.5rem;
        color: #495057;
    }
    .class-info strong {
        color: #2c3e50;
    }
`;
document.head.appendChild(classInfoStyle);

// Add a function to check localStorage availability
function isLocalStorageAvailable() {
    try {
        const test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch(e) {
        return false;
    }
}

function showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white bg-success border-0';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class='bx bx-check-circle me-2'></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    const container = document.querySelector('.toast-container') || (() => {
        const cont = document.createElement('div');
        cont.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(cont);
        return cont;
    })();
    
    container.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { delay: 5000 });
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

// Add new functions for class information features
function showClassInformation() {
    const infoModal = document.createElement('div');
    infoModal.className = 'modal fade';
    infoModal.id = 'classInfoModal';
    infoModal.setAttribute('tabindex', '-1');
    infoModal.setAttribute('aria-labelledby', 'classInfoModalLabel');
    infoModal.setAttribute('aria-hidden', 'true');
    
    infoModal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="classInfoModalLabel">${currentClass.name} Information</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <ul class="nav nav-tabs" id="classInfoTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="attendance-tab" data-bs-toggle="tab" data-bs-target="#attendance" type="button" role="tab">Attendance History</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="timetable-tab" data-bs-toggle="tab" data-bs-target="#timetable" type="button" role="tab">Time Table</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="notes-tab" data-bs-toggle="tab" data-bs-target="#notes" type="button" role="tab">Notes</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="application-tab" data-bs-toggle="tab" data-bs-target="#application" type="button" role="tab">Application Form</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="exam-tab" data-bs-toggle="tab" data-bs-target="#exam" type="button" role="tab">Online Exam</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="result-tab" data-bs-toggle="tab" data-bs-target="#result" type="button" role="tab">Results</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="activities-tab" data-bs-toggle="tab" data-bs-target="#activities" type="button" role="tab">School Activities</button>
                        </li>
                    </ul>
                    <div class="tab-content p-3" id="classInfoTabsContent">
                        <div class="tab-pane fade show active" id="attendance" role="tabpanel">
                            <div class="attendance-history">
                                <h6>Attendance History</h6>
                                <div class="table-responsive">
                                    <table class="table table-striped">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Present</th>
                                                <th>Absent</th>
                                                <th>Percentage</th>
                                            </tr>
                                        </thead>
                                        <tbody id="attendanceHistoryBody"></tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="timetable" role="tabpanel">
                            <div class="timetable">
                                <h6>Class Time Table</h6>
                                <div class="table-responsive">
                                    <table class="table table-bordered">
                                        <thead>
                                            <tr>
                                                <th>Time</th>
                                                <th>Monday</th>
                                                <th>Tuesday</th>
                                                <th>Wednesday</th>
                                                <th>Thursday</th>
                                                <th>Friday</th>
                                            </tr>
                                        </thead>
                                        <tbody id="timetableBody"></tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="notes" role="tabpanel">
                            <div class="notes-section">
                                <h6>Class Notes</h6>
                                <div class="mb-3">
                                    <textarea class="form-control" id="classNotes" rows="5" placeholder="Add notes here..."></textarea>
                                    <button class="btn btn-primary mt-2" onclick="saveClassNotes()">Save Notes</button>
                                </div>
                                <div id="savedNotes"></div>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="application" role="tabpanel">
                            <div class="application-form">
                                <h6>Application Form</h6>
                                <form id="studentApplicationForm" class="needs-validation" novalidate>
                                    <div class="mb-3">
                                        <label class="form-label required">Student Name</label>
                                        <input type="text" class="form-control" id="applicationStudentName" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label required">Application Type</label>
                                        <select class="form-select" id="applicationType" required onchange="handleApplicationTypeChange()">
                                            <option value="">Select Type</option>
                                            <option value="admission">Admission</option>
                                            <option value="transfer">Transfer</option>
                                            <option value="leave">Leave</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div class="mb-3 d-none" id="otherTypeContainer">
                                        <label class="form-label required">Specify Application Type</label>
                                        <input type="text" class="form-control" id="otherApplicationType" placeholder="Enter application type">
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label required">Details</label>
                                        <textarea class="form-control" id="applicationDetails" rows="3" required></textarea>
                                    </div>
                                    <button type="submit" class="btn btn-primary">Submit Application</button>
                                </form>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="exam" role="tabpanel">
                            <div class="online-exam">
                                <h6>Online Exams</h6>
                                <div id="examList">
                                    <div class="card mb-3">
                                        <div class="card-body">
                                            <h5 class="card-title">Mathematics Test</h5>
                                            <p class="card-text">Duration: 1 hour</p>
                                            <p class="card-text">Total Marks: 100</p>
                                            <button class="btn btn-primary">Start Exam</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="result" role="tabpanel">
                            <div class="results">
                                <div class="card">
                                    <div class="card-body">
                                        <h5 class="card-title mb-4">SEARCH YOUR RESULT</h5>
                                        <form id="resultSearchForm" class="mb-4">
                                            <div class="row g-3">
                                                <div class="col-md-12">
                                                    <label class="form-label required">Exam</label>
                                                    <select class="form-select" id="examSelect" required>
                                                        <option value="">Select Exam</option>
                                                    </select>
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label">Year</label>
                                                    <select class="form-select" id="yearSelect">
                                                        <option value="">All Years</option>
                                                        <option value="2024">2024</option>
                                                        <option value="2023">2023</option>
                                                        <option value="2022">2022</option>
                                                    </select>
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label">Exam Type</label>
                                                    <select class="form-select" id="examTypeSelect">
                                                        <option value="">All Exams</option>
                                                        <option value="midterm1">First Midterm</option>
                                                        <option value="midterm2">Second Midterm</option>
                                                        <option value="final">Final Exam</option>
                                                        <option value="practical">Practical Exam</option>
                                                        <option value="internal">Internal Assessment</option>
                                                    </select>
                                                </div>
                                                <div class="col-12">
                                                    <button type="submit" class="btn btn-primary">
                                                        <i class='bx bx-search'></i> Search Result
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                        <div id="resultContent" class="d-none">
                                            <div class="table-responsive">
                                                <table class="table table-striped">
                                                    <thead>
                                                        <tr>
                                                            <th>Exam Name</th>
                                                            <th>Exam Type</th>
                                                            <th>Year</th>
                                                            <th>Total Marks</th>
                                                            <th>Obtained Marks</th>
                                                            <th>Percentage</th>
                                                            <th>Grade</th>
                                                            <th>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody id="resultsBody"></tbody>
                                                </table>
                                            </div>
                                        </div>
                                        <div id="noResultMessage" class="alert alert-info d-none">
                                            No results found for the selected criteria.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="activities" role="tabpanel">
                            <div class="school-activities">
                                <h6>School Activities</h6>
                                <div id="activitiesList">
                                    <div class="card mb-3">
                                        <div class="card-body">
                                            <h5 class="card-title">Annual Sports Day</h5>
                                            <p class="card-text">Date: 15th March 2024</p>
                                            <p class="card-text">Description: Participate in various sports events</p>
                                            <button class="btn btn-primary" onclick="enrollActivity('sports')">Enroll Now</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(infoModal);
    const modal = new bootstrap.Modal(infoModal);
    modal.show();

    // Load initial data
    loadAttendanceHistory();
    loadTimetable();
    loadClassNotes();
    loadExamResults();
    loadActivities();
}

// Add CSS for the new features
const infoButtonStyle = document.createElement('style');
infoButtonStyle.textContent = `
    .info-button {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 1000;
    }
    .class-info-card {
        position: relative;
    }
    .nav-tabs .nav-link {
        color: #495057;
    }
    .nav-tabs .nav-link.active {
        color: #0d6efd;
        font-weight: bold;
    }
    .tab-content {
        border: 1px solid #dee2e6;
        border-top: none;
        border-radius: 0 0 0.25rem 0.25rem;
    }
    .activity-card {
        transition: transform 0.2s;
    }
    .activity-card:hover {
        transform: translateY(-5px);
    }
`;
document.head.appendChild(infoButtonStyle);

// Add functions to handle the new features
function loadAttendanceHistory() {
    const storageKey = `attendance_history_${currentClass.id}`;
    const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const tbody = document.getElementById('attendanceHistoryBody');
    tbody.innerHTML = history.map(record => `
        <tr>
            <td>${new Date(record.date).toLocaleDateString()}</td>
            <td>${record.present}</td>
            <td>${record.absent}</td>
            <td>${record.percentage}%</td>
        </tr>
    `).join('');
}

function loadTimetable() {
    const storageKey = `timetable_${currentClass.id}`;
    const timetable = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const tbody = document.getElementById('timetableBody');
    tbody.innerHTML = timetable.map(period => `
        <tr>
            <td>${period.time}</td>
            <td>${period.monday}</td>
            <td>${period.tuesday}</td>
            <td>${period.wednesday}</td>
            <td>${period.thursday}</td>
            <td>${period.friday}</td>
        </tr>
    `).join('');
}

function loadClassNotes() {
    const storageKey = `class_notes_${currentClass.id}`;
    const notes = localStorage.getItem(storageKey) || '';
    
    document.getElementById('classNotes').value = notes;
    document.getElementById('savedNotes').innerHTML = notes;
}

function saveClassNotes() {
    const notes = document.getElementById('classNotes').value;
    const storageKey = `class_notes_${currentClass.id}`;
    localStorage.setItem(storageKey, notes);
    document.getElementById('savedNotes').innerHTML = notes;
    showSuccess('Notes saved successfully');
}

function loadExamResults() {
    const storageKey = `exam_results_${currentClass.id}`;
    const results = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const tbody = document.getElementById('resultsBody');
    tbody.innerHTML = results.map(result => `
        <tr>
            <td>${result.examName}</td>
            <td>${result.examType}</td>
            <td>${result.year}</td>
            <td>${result.totalMarks}</td>
            <td>${result.obtainedMarks}</td>
            <td>${result.percentage}%</td>
            <td>${result.grade}</td>
            <td class="status-${result.status.toLowerCase()}">${result.status}</td>
        </tr>
    `).join('');
}

function loadActivities() {
    const storageKey = `school_activities`;
    const activities = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const container = document.getElementById('activitiesList');
    container.innerHTML = activities.map(activity => `
        <div class="card mb-3 activity-card">
            <div class="card-body">
                <h5 class="card-title">${activity.title}</h5>
                <p class="card-text">Date: ${new Date(activity.date).toLocaleDateString()}</p>
                <p class="card-text">${activity.description}</p>
                <button class="btn btn-primary" onclick="enrollActivity('${activity.id}')">Enroll Now</button>
            </div>
        </div>
    `).join('');
}

function enrollActivity(activityId) {
    const storageKey = `activity_enrollments_${currentClass.id}`;
    const enrollments = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    if (!enrollments.includes(activityId)) {
        enrollments.push(activityId);
        localStorage.setItem(storageKey, JSON.stringify(enrollments));
        showSuccess('Successfully enrolled in the activity');
    } else {
        showError('Already enrolled in this activity');
    }
}

// Add CSS for the results section
const resultStyles = document.createElement('style');
resultStyles.textContent = `
    .required:after {
        content: " *";
        color: red;
    }
    .results .card {
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .results .card-title {
        color: #2c3e50;
        font-weight: 600;
    }
    .results .form-label {
        font-weight: 500;
        color: #2c3e50;
    }
    .results .btn-primary {
        padding: 8px 20px;
    }
    .results .table th {
        background-color: #f8f9fa;
        font-weight: 600;
    }
    .status-passed {
        color: #28a745;
        font-weight: 500;
    }
    .status-failed {
        color: #dc3545;
        font-weight: 500;
    }
`;
document.head.appendChild(resultStyles);

// Function to initialize exam select options
function initializeExamSelect() {
    const examSelect = document.getElementById('examSelect');
    if (!examSelect) return;

    const year = document.getElementById('yearSelect').value;
    const examType = document.getElementById('examTypeSelect').value;
    
    // Clear existing options except the first one
    examSelect.innerHTML = '<option value="">Select Exam</option>';
    
    // Add exam options based on filters
    const currentYear = new Date().getFullYear();
    const examTypes = ['Regular Exam', 'Supplementary Exam'];
    const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Computer Science', 'English'];
    
    subjects.forEach(subject => {
        const yearToUse = year || currentYear;
        const examTypeText = examType ? 
            document.getElementById('examTypeSelect').options[
                document.getElementById('examTypeSelect').selectedIndex
            ].text : 'All Exams';
        
        const examText = `${subject} - ${examTypeText} ${yearToUse}`;
        
        const option = document.createElement('option');
        option.value = examText.toLowerCase().replace(/\s+/g, '-');
        option.textContent = examText;
        examSelect.appendChild(option);
    });
}

// Function to update exam select based on filters
function updateExamSelect() {
    initializeExamSelect();
}

// Function to search and display results
function searchResults() {
    const exam = document.getElementById('examSelect').value;
    const year = document.getElementById('yearSelect').value;
    const examType = document.getElementById('examTypeSelect').value;
    
    // Get results from localStorage
    const storageKey = `exam_results_${currentClass.id}`;
    let results = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    // Filter results based on criteria
    results = results.filter(result => {
        const matchesExam = !exam || result.examId === exam;
        const matchesYear = !year || result.year.toString() === year;
        const matchesExamType = !examType || result.examType.toLowerCase().replace(/\s+/g, '') === examType;
        return matchesExam && matchesYear && matchesExamType;
    });

    // Show/hide appropriate elements
    const resultContent = document.getElementById('resultContent');
    const noResultMessage = document.getElementById('noResultMessage');
    const resultsBody = document.getElementById('resultsBody');

    if (results.length === 0) {
        resultContent.classList.add('d-none');
        noResultMessage.classList.remove('d-none');
        return;
    }

    // Display results
    resultContent.classList.remove('d-none');
    noResultMessage.classList.add('d-none');
    
    resultsBody.innerHTML = results.map(result => `
        <tr>
            <td>${result.examName}</td>
            <td>${result.examType}</td>
            <td>${result.year}</td>
            <td>${result.totalMarks}</td>
            <td>${result.obtainedMarks}</td>
            <td>${result.percentage}%</td>
            <td>${result.grade}</td>
            <td class="status-${result.status.toLowerCase()}">${result.status}</td>
        </tr>
    `).join('');
}

// Function to add sample result data (for testing)
function addSampleResults() {
    const sampleResults = [
        {
            examId: 'mathematics-first-midterm-2024',
            examName: 'Mathematics',
            examType: 'First Midterm',
            year: 2024,
            totalMarks: 50,
            obtainedMarks: 45,
            percentage: 90,
            grade: 'A+',
            status: 'Passed'
        },
        {
            examId: 'physics-second-midterm-2024',
            examName: 'Physics',
            examType: 'Second Midterm',
            year: 2024,
            totalMarks: 50,
            obtainedMarks: 42,
            percentage: 84,
            grade: 'A',
            status: 'Passed'
        },
        {
            examId: 'chemistry-final-exam-2024',
            examName: 'Chemistry',
            examType: 'Final Exam',
            year: 2024,
            totalMarks: 100,
            obtainedMarks: 85,
            percentage: 85,
            grade: 'A',
            status: 'Passed'
        }
    ];

    const storageKey = `exam_results_${currentClass.id}`;
    localStorage.setItem(storageKey, JSON.stringify(sampleResults));
}

// Call this function when initializing a new class to add sample data
function initializeClassData(classId) {
    if (!localStorage.getItem(`exam_results_${classId}`)) {
        addSampleResults();
    }
}

// Add function to handle application type change
function handleApplicationTypeChange() {
    const applicationType = document.getElementById('applicationType');
    const otherTypeContainer = document.getElementById('otherTypeContainer');
    const otherApplicationType = document.getElementById('otherApplicationType');
    
    if (applicationType.value === 'other') {
        otherTypeContainer.classList.remove('d-none');
        otherApplicationType.setAttribute('required', 'required');
    } else {
        otherTypeContainer.classList.add('d-none');
        otherApplicationType.removeAttribute('required');
    }
}

// Update the application submission handler
function handleApplicationSubmit(event) {
    event.preventDefault();
    
    const studentName = document.getElementById('applicationStudentName').value;
    const applicationType = document.getElementById('applicationType');
    const otherApplicationType = document.getElementById('otherApplicationType');
    const details = document.getElementById('applicationDetails').value;
    
    let finalApplicationType = applicationType.value;
    if (finalApplicationType === 'other') {
        finalApplicationType = otherApplicationType.value;
    }
    
    if (!studentName || !finalApplicationType || !details) {
        showError('Please fill in all required fields');
        return;
    }
    
    // Save application
    const application = {
        id: `app_${Date.now()}`,
        studentName: studentName,
        type: finalApplicationType,
        details: details,
        classId: currentClass.id,
        className: currentClass.name,
        status: 'Pending',
        submittedAt: new Date().toISOString()
    };
    
    // Save to localStorage
    const storageKey = `applications_${currentClass.id}`;
    const applications = JSON.parse(localStorage.getItem(storageKey) || '[]');
    applications.push(application);
    localStorage.setItem(storageKey, JSON.stringify(applications));
    
    // Show success message
    showSuccess('Application submitted successfully');
    
    // Reset form
    event.target.reset();
    handleApplicationTypeChange(); // Reset other type field visibility
}

// Add CSS for application form
const applicationStyles = document.createElement('style');
applicationStyles.textContent = `
    .application-form {
        max-width: 800px;
        margin: 0 auto;
    }
    .application-form .form-label.required:after {
        content: " *";
        color: red;
    }
    .application-form .btn-primary {
        min-width: 150px;
    }
    #otherTypeContainer {
        transition: all 0.3s ease;
    }
    #otherTypeContainer.d-none {
        opacity: 0;
        height: 0;
        margin: 0;
    }
    #otherTypeContainer:not(.d-none) {
        opacity: 1;
        margin-bottom: 1rem;
    }
`;
document.head.appendChild(applicationStyles);

// Add request functionality to existing staff dashboard code
function submitRequest(type, details) {
    const staffData = JSON.parse(localStorage.getItem('currentStaff') || '{}');
    
    const request = {
        id: 'REQ' + Date.now(),
        staffId: staffData.id,
        staffName: staffData.name,
        type: type,
        details: details,
        date: new Date().toISOString(),
        status: 'PENDING'
    };

    try {
        const requests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
        requests.push(request);
        localStorage.setItem('pendingRequests', JSON.stringify(requests));
        
        showAlert('Request submitted successfully. Waiting for admin approval.', 'success');
        loadRequestHistory();
    } catch (error) {
        console.error('Error submitting request:', error);
        showAlert('Failed to submit request. Please try again.', 'danger');
    }
}

// Add request history section to the dashboard
function loadRequestHistory() {
    const staffData = JSON.parse(localStorage.getItem('currentStaff') || '{}');
    const requests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
    const myRequests = requests.filter(req => req.staffId === staffData.id);
    
    const requestsList = document.getElementById('requestHistory');
    if (requestsList) {
        requestsList.innerHTML = '';
        
        myRequests.forEach(request => {
            const div = document.createElement('div');
            div.className = 'request-item card mb-3';
            div.innerHTML = `
                <div class="card-body">
                    <h6 class="card-subtitle mb-2 text-muted">Request ID: ${request.id}</h6>
                    <p class="card-text">Type: ${request.type}</p>
                    <p class="card-text">Status: <span class="badge status-${request.status.toLowerCase()}">${request.status}</span></p>
                    <p class="card-text">Date: ${new Date(request.date).toLocaleDateString()}</p>
                    ${request.details ? `<p class="card-text">Details: ${request.details}</p>` : ''}
                </div>
            `;
            requestsList.appendChild(div);
        });
    }
}

// Add new request modal functionality
function showNewRequestModal() {
    const modalHtml = `
        <div class="modal fade" id="newRequestModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Submit New Request</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="newRequestForm">
                            <div class="mb-3">
                                <label class="form-label">Request Type</label>
                                <select class="form-select" name="requestType" required>
                                    <option value="">Select request type</option>
                                    <option value="Leave">Leave Request</option>
                                    <option value="Schedule Change">Schedule Change</option>
                                    <option value="Resource">Resource Request</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Details</label>
                                <textarea class="form-control" name="requestDetails" rows="3" required></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="submitNewRequest()">Submit Request</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body if it doesn't exist
    if (!document.getElementById('newRequestModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('newRequestModal'));
    modal.show();
}

// Handle new request submission
function submitNewRequest() {
    const form = document.getElementById('newRequestForm');
    const type = form.querySelector('[name="requestType"]').value;
    const details = form.querySelector('[name="requestDetails"]').value;
    
    if (!type || !details) {
        showAlert('Please fill in all required fields', 'danger');
        return;
    }
    
    submitRequest(type, details);
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('newRequestModal'));
    modal.hide();
    form.reset();
}

// Function to download attendance report
function downloadReport(type) {
    try {
        const currentDate = new Date().toISOString().split('T')[0];
        const filename = `${type}_report_${currentDate}.csv`;
        let csvContent = '';

        // Get the data based on report type
        switch(type) {
            case 'attendance':
                csvContent = generateAttendanceReport();
                break;
            case 'leave':
                csvContent = generateLeaveReport();
                break;
            default:
                throw new Error('Invalid report type');
        }

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) {
        console.error('Error downloading report:', error);
        showAlert('Failed to download report', 'error');
    }
}

// Function to generate attendance report CSV
function generateAttendanceReport() {
    const headers = ['Date', 'Student Name', 'Class', 'Status', 'Marked By'];
    let csvContent = headers.join(',') + '\n';
    
    // Get attendance data from state or localStorage
    const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
    
    attendanceRecords.forEach(record => {
        const row = [
            new Date(record.date).toLocaleDateString(),
            record.studentName,
            record.className,
            record.status,
            record.markedBy
        ];
        csvContent += row.join(',') + '\n';
    });
    
    return csvContent;
}

// Function to generate leave report CSV
function generateLeaveReport() {
    const headers = ['Date', 'Student Name', 'Reason', 'Status'];
    let csvContent = headers.join(',') + '\n';
    
    // Get leave request data
    const leaveRequests = JSON.parse(localStorage.getItem('leaveRequests') || '[]');
    
    leaveRequests.forEach(request => {
        const row = [
            new Date(request.date).toLocaleDateString(),
            request.studentName,
            request.reason,
            request.status
        ];
        csvContent += row.join(',') + '\n';
    });
    
    return csvContent;
}

// Function to load and display leave requests
async function loadLeaveRequests() {
    try {
        const response = await fetch('/api/leave/requests', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch leave requests');
        }

        const data = await response.json();
        const leaveRequestsContainer = document.getElementById('leaveRequestsTable');
        
        if (leaveRequestsContainer) {
            const tbody = leaveRequestsContainer.querySelector('tbody') || leaveRequestsContainer;
            tbody.innerHTML = '';

            data.requests.forEach(request => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(request.date).toLocaleDateString()}</td>
                    <td>${request.studentName}</td>
                    <td>${request.reason}</td>
                    <td>
                        <span class="badge bg-${getStatusColor(request.status)}">${request.status}</span>
                    </td>
                    <td>
                        ${request.status === 'pending' ? `
                            <button class="btn btn-sm btn-success" onclick="updateLeaveStatus('${request._id}', 'approved')">
                                Approve
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="updateLeaveStatus('${request._id}', 'rejected')">
                                Reject
                            </button>
                        ` : '-'}
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error loading leave requests:', error);
        showAlert('Failed to load leave requests', 'error');
    }
}

// Function to update leave request status
async function updateLeaveStatus(requestId, status) {
    try {
        const response = await fetch(`/api/leave/request/${requestId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        if (!response.ok) {
            throw new Error('Failed to update leave request');
        }

        showAlert(`Leave request ${status} successfully`, 'success');
        loadLeaveRequests(); // Reload the table
    } catch (error) {
        console.error('Error updating leave request:', error);
        showAlert('Failed to update leave request', 'error');
    }
}

// Helper function to get status color
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

// Add a button to generate sample data for demo/testing
function addSampleDataButton() {
    const section = document.getElementById('viewAttendanceSection');
    if (!document.getElementById('generateSampleDataBtn')) {
        const btn = document.createElement('button');
        btn.id = 'generateSampleDataBtn';
        btn.className = 'btn btn-warning mb-3';
        btn.innerHTML = '<i class="bx bx-data"></i> Generate Sample Data';
        btn.onclick = generateSampleAttendanceData;
        section.insertBefore(btn, section.firstChild);
    }
}

function generateSampleAttendanceData() {
    // Generate sample data for 3 classes, 5 days
    const today = new Date();
    for (let classId = 1; classId <= 3; classId++) {
        for (let d = 0; d < 5; d++) {
            const date = new Date(today);
            date.setDate(today.getDate() - d);
            const dateStr = date.toISOString().split('T')[0];
            const students = [];
            for (let s = 1; s <= 10; s++) {
                students.push({
                    id: `${classId}_${s}`,
                    rollNo: s.toString().padStart(2, '0'),
                    name: `Student ${s}`,
                    status: Math.random() > 0.2 // 80% present
                });
            }
            const record = {
                classId: classId,
                date: dateStr,
                uniqueIdentifier: `class_${classId}_${dateStr}`,
                lastUpdated: new Date().toISOString(),
                students: students
            };
            localStorage.setItem(`attendance_${classId}_${dateStr}`, JSON.stringify(record));
        }
    }
    showSuccess('Sample attendance data generated!');
    loadAttendanceHistory();
}

// Responsive improvements for table and cards
const responsiveStyles = document.createElement('style');
responsiveStyles.textContent = `
@media (max-width: 991px) {
  .row.mb-4 > .col-md-3 { flex: 0 0 50%; max-width: 50%; margin-bottom: 1rem; }
}
@media (max-width: 767px) {
  .row.mb-4 > .col-md-3 { flex: 0 0 100%; max-width: 100%; margin-bottom: 1rem; }
  .card-header.d-flex { flex-direction: column; align-items: stretch; gap: 0.5rem; }
  .d-flex.gap-2 { flex-direction: column; gap: 0.5rem !important; }
  .table-responsive { font-size: 0.95rem; }
  .btn, .form-control, .form-select { font-size: 1rem; }
}
#attendanceHistoryBody td, #attendanceHistoryBody th { vertical-align: middle; }
`;
document.head.appendChild(responsiveStyles);

// Patch loadViewAttendanceSection to add the sample data button
const origLoadViewAttendanceSection = loadViewAttendanceSection;
loadViewAttendanceSection = async function() {
    await origLoadViewAttendanceSection();
    addSampleDataButton();
};

// Add a class-wise history dropdown when 'All Classes' is selected (below statistics cards)
function addClassWiseHistoryDropdown() {
    const classFilter = document.getElementById('classFilter');
    const container = document.getElementById('viewAttendanceSection');
    let dropdown = document.getElementById('classWiseHistoryDropdown');
    const statsRow = container.querySelector('.row.mb-4');
    if (classFilter.value === '' && loadedClassList.length > 0) {
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'classWiseHistoryDropdown';
            dropdown.className = 'mb-3';
            dropdown.innerHTML = `
                <label for="classWiseSelect" class="form-label">View Class-wise History</label>
                <select class="form-select" id="classWiseSelect">
                    <option value="">Select Class</option>
                    ${loadedClassList.map(cls => `<option value="${cls.id}">${cls.name}</option>`).join('')}
                </select>
            `;
            // Insert after statistics cards
            statsRow.parentNode.insertBefore(dropdown, statsRow.nextSibling);
            document.getElementById('classWiseSelect').addEventListener('change', function() {
                showClassWiseHistory(this.value);
            });
        } else {
            dropdown.style.display = 'block';
        }
    } else if (dropdown) {
        dropdown.style.display = 'none';
    }
}

function showClassWiseHistory(classId) {
    if (!classId) {
        // Reset to all classes view
        loadAttendanceHistory();
        return;
    }
    // Filter attendance records for the selected class only
    const date = document.getElementById('dateFilter').value;
    const attendanceRecords = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('attendance_')) {
            const record = JSON.parse(localStorage.getItem(key));
            if (record.classId === parseInt(classId) && (!date || record.date === date)) {
                attendanceRecords.push(record);
            }
        }
    }
    attendanceRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    updateAttendanceStatistics(attendanceRecords, classId);
    updateAttendanceChart(attendanceRecords);
    const tbody = document.getElementById('attendanceHistoryBody');
    tbody.innerHTML = attendanceRecords.map(record => {
        const presentCount = record.students.filter(s => s.status === true).length;
        const totalStudents = record.students.length;
        const attendancePercentage = ((presentCount / totalStudents) * 100).toFixed(1);
        const className = loadedClassList.find(cls => cls.id === record.classId)?.name || `Class ${record.classId}`;
        return `
            <tr>
                <td>${new Date(record.date).toLocaleDateString()}</td>
                <td>${className}</td>
                <td>${totalStudents}</td>
                <td>${presentCount}</td>
                <td>${totalStudents - presentCount}</td>
                <td>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar ${getProgressBarColor(attendancePercentage)}" 
                             role="progressbar" 
                             style="width: ${attendancePercentage}%"
                             aria-valuenow="${attendancePercentage}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                            ${attendancePercentage}%
                        </div>
                    </div>
                </td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewAttendanceDetails('${record.uniqueIdentifier}')">
                        <i class='bx bx-detail'></i> Details
                    </button>
                    <button class="btn btn-sm btn-success" onclick="editAttendance('${record.uniqueIdentifier}')">
                        <i class='bx bx-edit'></i> Edit
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Add or update the detailed student history table for class-wise view
function showClassWiseStudentHistory(classId) {
    // Remove existing table if present
    let detailTable = document.getElementById('classWiseStudentHistoryTable');
    if (detailTable) detailTable.remove();
    if (!classId) return;

    // Gather all attendance records for this class
    const date = document.getElementById('dateFilter').value;
    const attendanceRecords = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('attendance_')) {
            const record = JSON.parse(localStorage.getItem(key));
            if (record.classId === parseInt(classId) && (!date || record.date === date)) {
                attendanceRecords.push(record);
            }
        }
    }
    if (!attendanceRecords.length) return;
    // Sort by date ascending
    attendanceRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Get all unique students in this class
    const studentMap = {};
    attendanceRecords.forEach(record => {
        record.students.forEach(student => {
            if (!studentMap[student.id]) {
                studentMap[student.id] = { name: student.name, rollNo: student.rollNo };
            }
        });
    });
    const students = Object.entries(studentMap).map(([id, info]) => ({ id, ...info }));

    // Build table header (dates)
    const dateHeaders = attendanceRecords.map(r => r.date);
    let tableHtml = `<div class="table-responsive mt-4" id="classWiseStudentHistoryTable">
        <h5>Student Attendance History</h5>
        <table class="table table-bordered table-striped">
            <thead>
                <tr>
                    <th>Roll No</th>
                    <th>Name</th>
                    ${dateHeaders.map(date => `<th>${new Date(date).toLocaleDateString()}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;
    students.forEach(student => {
        tableHtml += `<tr><td>${student.rollNo}</td><td>${student.name}</td>`;
        dateHeaders.forEach(date => {
            // Find this student's status for this date
            const rec = attendanceRecords.find(r => r.date === date);
            const stu = rec.students.find(s => s.id === student.id);
            let status = '-';
            if (stu) status = stu.status === true ? '<span class="badge bg-success">Present</span>' : '<span class="badge bg-danger">Absent</span>';
            tableHtml += `<td>${status}</td>`;
        });
        tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table></div>';

    // Insert after main table
    const mainTable = document.getElementById('attendanceHistoryBody').parentNode.parentNode;
    mainTable.insertAdjacentHTML('afterend', tableHtml);
}

// Patch showClassWiseHistory to also show the student history table
const origShowClassWiseHistory = showClassWiseHistory;
showClassWiseHistory = function(classId) {
    origShowClassWiseHistory(classId);
    showClassWiseStudentHistory(classId);
};

// Patch loadAttendanceHistory to remove the detailed table if not in class-wise view
const origLoadAttendanceHistory2 = loadAttendanceHistory;
loadAttendanceHistory = async function() {
    await origLoadAttendanceHistory2();
    addClassWiseHistoryDropdown();
    // Reset class-wise dropdown to default when main filter changes
    const classWiseSelect = document.getElementById('classWiseSelect');
    if (classWiseSelect) classWiseSelect.value = '';
    // Remove detailed table if present
    let detailTable = document.getElementById('classWiseStudentHistoryTable');
    if (detailTable) detailTable.remove();
};