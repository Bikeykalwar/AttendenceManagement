document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        checkAuthAndRedirect();
    }

    // Show/Hide Password functionality
    const showPasswordCheckbox = document.getElementById('showPassword');
    const passwordInput = document.querySelector('input[name="password"]');

    showPasswordCheckbox.addEventListener('change', function() {
        passwordInput.type = this.checked ? 'text' : 'password';
    });

    // Handle form submission
    const authForm = document.getElementById('authForm');
    authForm.addEventListener('submit', handleLogin);
});

async function checkAuthAndRedirect() {
    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        
        if (data.success) {
            redirectToDashboard(data.user.role);
        } else {
            localStorage.removeItem('token');
        }
    } catch (error) {
        localStorage.removeItem('token');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        username: formData.get('username'),
        password: formData.get('password'),
        role: formData.get('role')
    };

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        
        if (result.success) {
            localStorage.setItem('token', result.token);
            redirectToDashboard(result.role);
        } else {
            showError(result.message || 'Login failed');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('An error occurred during login');
    }
}

function redirectToDashboard(role) {
    if (role === 'staff') {
        window.location.href = '/staff/dashboard.html';
    } else if (role === 'student') {
        window.location.href = '/student/dashboard.html';
    } else {
        showError('Invalid role');
    }
}

function showForgotPassword() {
    const loginForm = document.getElementById('loginForm');
    loginForm.innerHTML = `
        <form id="forgotPasswordForm">
            <h4 class="mb-4">Forgot Password</h4>
            <div class="mb-3">
                <label class="form-label">Select Role *</label>
                <select class="form-select" name="role" required>
                    <option value="staff">Staff</option>
                    <option value="student">Student</option>
                </select>
            </div>
            <div class="mb-3">
                <label class="form-label">Email *</label>
                <input type="email" class="form-control" name="email" required>
            </div>
            <div class="d-grid gap-2">
                <button type="submit" class="btn btn-primary">Submit</button>
                <button type="button" class="btn btn-secondary" onclick="showLoginForm()">Back to Login</button>
            </div>
        </form>
    `;

    // Handle forgot password form submission
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    forgotPasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);

        // Send forgot password request to server
        fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showMessage('Password reset instructions have been sent to your email.');
                setTimeout(() => showLoginForm(), 3000);
            } else {
                showError(data.message);
            }
        })
        .catch(error => {
            showError('An error occurred. Please try again.');
        });
    });
}

function showLoginForm() {
    const loginForm = document.getElementById('loginForm');
    loginForm.innerHTML = `
        <form id="authForm">
            <div class="mb-3">
                <label class="form-label">Role *</label>
                <div class="d-flex gap-4">
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="role" value="staff" checked>
                        <label class="form-check-label">Staff</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="role" value="student">
                        <label class="form-check-label">Student</label>
                    </div>
                </div>
            </div>
            <div class="mb-3">
                <label class="form-label">Username *</label>
                <input type="text" class="form-control" name="username" placeholder="Email / Staff Code / Student ID" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Password *</label>
                <input type="password" class="form-control" name="password" required>
                <div class="form-check mt-2">
                    <input class="form-check-input" type="checkbox" id="showPassword">
                    <label class="form-check-label" for="showPassword">Show Password</label>
                </div>
            </div>
            <div class="d-grid gap-2">
                <button type="submit" class="btn btn-primary">Login</button>
                <button type="button" class="btn btn-danger" onclick="showForgotPassword()">Forgot Password</button>
            </div>
        </form>
    `;
    
    // Reattach event listeners
    const showPasswordCheckbox = document.getElementById('showPassword');
    const passwordInput = document.querySelector('input[name="password"]');
    showPasswordCheckbox.addEventListener('change', function() {
        passwordInput.type = this.checked ? 'text' : 'password';
    });

    const authForm = document.getElementById('authForm');
    authForm.addEventListener('submit', handleLogin);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger mt-3';
    errorDiv.textContent = message;
    document.querySelector('.card-body').appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

function showMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'alert alert-success mt-3';
    messageDiv.textContent = message;
    document.querySelector('.card-body').appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
} 