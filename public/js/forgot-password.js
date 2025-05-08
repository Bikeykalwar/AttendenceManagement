// Forgot Password Functionality
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgotPasswordForm');
    const loadingSpinner = document.querySelector('.loading-spinner');

    // Function to show alert message
    function showAlert(message, type = 'success') {
        // Remove any existing alerts
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // Create new alert
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.setAttribute('role', 'alert');
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        // Insert alert before the form
        form.parentNode.insertBefore(alert, form);

        // Auto dismiss after 5 seconds
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    }

    // Function to validate email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userType = document.getElementById('userType').value;
        const email = document.getElementById('email').value.trim();

        // Validate inputs
        if (!userType) {
            showAlert('Please select a user type', 'danger');
            return;
        }

        if (!email || !isValidEmail(email)) {
            showAlert('Please enter a valid email address', 'danger');
            return;
        }

        try {
            // Show loading spinner
            loadingSpinner.classList.remove('d-none');

            // Simulate API call with timeout
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Here you would typically make an API call to your backend
            // const response = await fetch('/api/forgot-password', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify({ userType, email })
            // });
            
            // if (!response.ok) {
            //     throw new Error('Failed to process request');
            // }

            // Show success message
            showAlert('Password reset instructions have been sent to your email address. Please check your inbox.');
            
            // Reset form
            form.reset();

        } catch (error) {
            console.error('Error:', error);
            showAlert('An error occurred while processing your request. Please try again later.', 'danger');
        } finally {
            // Hide loading spinner
            loadingSpinner.classList.add('d-none');
        }
    });
});

async function handleForgotPassword(event) {
    event.preventDefault();
    
    const role = document.getElementById('roleSelect').value;
    const email = document.getElementById('emailInput').value;
    
    if (!role || !email) {
        showError('Please fill in all required fields');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Please enter a valid email address');
        return;
    }

    try {
        showLoadingSpinner();
        
        // Check if email exists in localStorage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === email && u.role === role);
        
        if (!user) {
            showError('No account found with this email and role');
            return;
        }

        // Generate temporary password
        const tempPassword = generateTemporaryPassword();
        user.password = tempPassword;
        user.passwordReset = true;
        
        // Update user in localStorage
        localStorage.setItem('users', JSON.stringify(users));

        // In a real application, you would send this via email
        // For demo purposes, we'll show it in a success message
        showSuccess(`Password reset successful! Temporary password: ${tempPassword}
            Please login with this password and change it immediately.`);

        // Reset form
        event.target.reset();
        
        // Redirect to login after 5 seconds
        setTimeout(() => {
            window.location.href = '/';
        }, 5000);

    } catch (error) {
        console.error('Error in password reset:', error);
        showError('Failed to process password reset');
    } finally {
        hideLoadingSpinner();
    }
}

function generateTemporaryPassword() {
    const length = 10;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    
    return password;
}

function showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
        <strong>Error!</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        <strong>Success!</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
} 