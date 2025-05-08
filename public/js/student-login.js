// Check if student is already logged in
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('studentAuthenticated') === 'true') {
        window.location.href = '/student/student-dashboard.html';
    }
});

// Handle student login
async function handleStudentLogin(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorAlert = document.getElementById('errorAlert');

    try {
        // In a real application, this would be an API call to verify credentials
        // For demo purposes, we'll use localStorage to simulate a database
        const students = JSON.parse(localStorage.getItem('students') || '[]');
        const student = students.find(s => s.studentId === studentId && s.password === password);

        if (student) {
            // Store student session
            localStorage.setItem('studentAuthenticated', 'true');
            localStorage.setItem('currentStudent', JSON.stringify({
                id: student.studentId,
                name: student.name,
                class: student.class,
                section: student.section
            }));

            // Add login activity to system logs
            const logs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
            logs.unshift({
                timestamp: new Date().toISOString(),
                user: `Student ${student.name}`,
                action: 'Logged in',
                details: `Student ID: ${student.studentId}`
            });
            localStorage.setItem('systemLogs', JSON.stringify(logs));

            // Redirect to student dashboard
            window.location.href = '/student/student-dashboard.html';
        } else {
            showError('Invalid Student ID or Password');
        }
    } catch (error) {
        showError('An error occurred during login');
        console.error('Login error:', error);
    }
}

// Show error message
function showError(message) {
    const errorAlert = document.getElementById('errorAlert');
    errorAlert.textContent = message;
    errorAlert.style.display = 'block';
    
    // Clear password field
    document.getElementById('password').value = '';
}

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const showPasswordCheckbox = document.getElementById('showPassword');
    passwordInput.type = showPasswordCheckbox.checked ? 'text' : 'password';
}

// Initialize demo data if not exists
function initializeDemoData() {
    if (!localStorage.getItem('students')) {
        const demoStudents = [
            {
                studentId: 'STU001',
                password: 'student123',
                name: 'John Doe',
                class: '10',
                section: 'A',
                attendance: []
            },
            {
                studentId: 'STU002',
                password: 'student123',
                name: 'Jane Smith',
                class: '10',
                section: 'B',
                attendance: []
            }
        ];
        localStorage.setItem('students', JSON.stringify(demoStudents));
    }
}

// Initialize demo data when the page loads
initializeDemoData(); 