// Store class data and students
let currentClass = null;
const classes = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `Class ${i + 1}`,
    students: generateRandomStudents(20)
}));

// Generate random student names
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

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Set today's date as default
    document.getElementById('attendanceDate').valueAsDate = new Date();
    
    // Initialize class grid
    initializeClassGrid();
    
    // Add form submission handler
    document.getElementById('addStudentForm').addEventListener('submit', handleAddStudent);
});

// Initialize class selection grid
function initializeClassGrid() {
    const classGrid = document.getElementById('classGrid');
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

// Handle class selection
function selectClass(classId) {
    currentClass = classes.find(c => c.id === classId);
    document.getElementById('classSelection').style.display = 'none';
    document.getElementById('classAttendance').style.display = 'block';
    document.getElementById('selectedClassTitle').textContent = `${currentClass.name} Attendance`;
    renderStudentList();
}

// Render student list
function renderStudentList() {
    const studentList = document.getElementById('studentList');
    studentList.innerHTML = currentClass.students.map(student => `
        <tr>
            <td>${student.rollNo}</td>
            <td>${student.name}</td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-outline-success ${student.attendance === true ? 'active' : ''}"
                            onclick="markAttendance(${student.id}, true)">
                        <i class='bx bx-check attendance-mark'></i>
                    </button>
                    <button class="btn btn-outline-danger ${student.attendance === false ? 'active' : ''}"
                            onclick="markAttendance(${student.id}, false)">
                        <i class='bx bx-x attendance-mark'></i>
                    </button>
                </div>
            </td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="removeStudent(${student.id})">
                    <i class='bx bx-trash'></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Mark attendance for a student
function markAttendance(studentId, isPresent) {
    const student = currentClass.students.find(s => s.id === studentId);
    if (student) {
        student.attendance = isPresent;
        renderStudentList();
    }
}

// Handle adding a new student
function handleAddStudent(event) {
    event.preventDefault();
    const nameInput = document.getElementById('studentName');
    const rollInput = document.getElementById('studentRoll');
    
    const newStudent = {
        id: currentClass.students.length + 1,
        rollNo: rollInput.value,
        name: nameInput.value,
        attendance: null
    };
    
    currentClass.students.push(newStudent);
    renderStudentList();
    
    // Reset form
    nameInput.value = '';
    rollInput.value = '';
}

// Remove a student
function removeStudent(studentId) {
    if (confirm('Are you sure you want to remove this student?')) {
        currentClass.students = currentClass.students.filter(s => s.id !== studentId);
        renderStudentList();
    }
}

// Go back to class selection
function backToClassSelection() {
    document.getElementById('classSelection').style.display = 'block';
    document.getElementById('classAttendance').style.display = 'none';
    currentClass = null;
}

// Save attendance
async function saveAttendance() {
    const date = document.getElementById('attendanceDate').value;
    const attendanceData = {
        classId: currentClass.id,
        date: date,
        students: currentClass.students.map(student => ({
            rollNo: student.rollNo,
            name: student.name,
            status: student.attendance
        }))
    };

    try {
        const response = await fetch('/api/attendance/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(attendanceData)
        });

        const result = await response.json();
        if (result.success) {
            alert('Attendance saved successfully!');
            backToClassSelection();
        } else {
            alert('Failed to save attendance. Please try again.');
        }
    } catch (error) {
        console.error('Error saving attendance:', error);
        alert('Failed to save attendance. Please check your connection and try again.');
    }
}

// Add animation effects
document.addEventListener('DOMContentLoaded', () => {
    // Add fade-in animation to cards
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => card.classList.add('fade-in'));

    // Add hover effects to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', () => button.classList.add('pulse'));
        button.addEventListener('mouseleave', () => button.classList.remove('pulse'));
    });
}); 