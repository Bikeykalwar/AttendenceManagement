// Check admin authentication
function checkAdminAuth() {
    if (localStorage.getItem('adminAuthenticated') !== 'true') {
        window.location.href = '/admin/admin-login.html';
        return false;
    }
    return true;
}

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first
    if (!checkAdminAuth()) return;

    loadDashboardData();
    loadPendingRequests();
    loadStaffList();
    loadSystemLogs();
});

// Load dashboard summary data
function loadDashboardData() {
    const pendingRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
    const staffList = JSON.parse(localStorage.getItem('staffList') || '[]');
    const classes = JSON.parse(localStorage.getItem('classes') || '[]');

    document.getElementById('pendingRequestCount').textContent = pendingRequests.length;
    document.getElementById('activeStaffCount').textContent = staffList.filter(staff => staff.status === 'active').length;
    document.getElementById('totalClassesCount').textContent = classes.length;
}

// Load and display pending requests
function loadPendingRequests() {
    const requests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
    const tbody = document.getElementById('pendingRequestsList');
    tbody.innerHTML = '';

    requests.forEach(request => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${request.id}</td>
            <td>${request.staffName}</td>
            <td>${request.type}</td>
            <td>${new Date(request.date).toLocaleDateString()}</td>
            <td><span class="badge status-${request.status.toLowerCase()}">${request.status}</span></td>
            <td>
                <button class="btn btn-sm btn-success btn-action" onclick="approveRequest('${request.id}')">
                    <i class="bi bi-check-circle"></i> Approve
                </button>
                <button class="btn btn-sm btn-danger btn-action" onclick="rejectRequest('${request.id}')">
                    <i class="bi bi-x-circle"></i> Reject
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Load and display staff list
function loadStaffList() {
    const staffList = JSON.parse(localStorage.getItem('staffList') || '[]');
    const tbody = document.getElementById('staffList');
    tbody.innerHTML = '';

    staffList.forEach(staff => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${staff.id}</td>
            <td>${staff.name}</td>
            <td>${staff.email}</td>
            <td>${staff.department}</td>
            <td><span class="badge ${staff.status === 'active' ? 'status-approved' : 'status-rejected'}">${staff.status}</span></td>
            <td>
                <button class="btn btn-sm btn-primary btn-action" onclick="editStaff('${staff.id}')">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                ${staff.status === 'active' ? `
                <button class="btn btn-sm btn-danger btn-action" onclick="deactivateStaff('${staff.id}')">
                    <i class="bi bi-person-x"></i> Deactivate
                </button>` : `
                <button class="btn btn-sm btn-success btn-action" onclick="activateStaff('${staff.id}')">
                    <i class="bi bi-person-check"></i> Activate
                </button>`}
                <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteStaff('${staff.id}')">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Load and display system logs
function loadSystemLogs() {
    const logs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
    const tbody = document.getElementById('systemLogsList');
    tbody.innerHTML = '';

    logs.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="timestamp">${new Date(log.timestamp).toLocaleString()}</td>
            <td>${log.user}</td>
            <td>${log.action}</td>
            <td>${log.details}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Add new staff member
async function addNewStaff() {
    const form = document.getElementById('addStaffForm');
    const formData = new FormData(form);
    
    const staffData = {
        id: 'STF' + Date.now(),
        name: formData.get('staffName'),
        email: formData.get('staffEmail'),
        department: formData.get('department'),
        password: formData.get('password'),
        status: 'active',
        createdAt: new Date().toISOString()
    };

    // Validate input
    if (!staffData.name || !staffData.email || !staffData.department || !staffData.password) {
        showAlert('Please fill in all required fields', 'danger');
        return;
    }

    try {
        const staffList = JSON.parse(localStorage.getItem('staffList') || '[]');
        
        // Check for duplicate email
        if (staffList.some(staff => staff.email === staffData.email)) {
            showAlert('A staff member with this email already exists', 'danger');
            return;
        }

        staffList.push(staffData);
        localStorage.setItem('staffList', JSON.stringify(staffList));

        // Add system log
        addSystemLog('Admin', 'Added new staff', `Added ${staffData.name} to staff list`);

        // Refresh staff list
        loadStaffList();
        loadDashboardData();

        // Close modal and show success message
        const modal = bootstrap.Modal.getInstance(document.getElementById('addStaffModal'));
        modal.hide();
        form.reset();
        showAlert('Staff member added successfully', 'success');

    } catch (error) {
        console.error('Error adding staff:', error);
        showAlert('Failed to add staff member', 'danger');
    }
}

// Approve staff request
function approveRequest(requestId) {
    const requests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
    const request = requests.find(r => r.id === requestId);
    
    if (request) {
        request.status = 'APPROVED';
        request.approvedAt = new Date().toISOString();
        localStorage.setItem('pendingRequests', JSON.stringify(requests));
        
        // Add system log
        addSystemLog('Admin', 'Approved request', `Approved request ${requestId}`);
        
        // Refresh data
        loadPendingRequests();
        loadDashboardData();
        showAlert('Request approved successfully', 'success');
    }
}

// Reject staff request
function rejectRequest(requestId) {
    const requests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
    const request = requests.find(r => r.id === requestId);
    
    if (request) {
        request.status = 'REJECTED';
        request.rejectedAt = new Date().toISOString();
        localStorage.setItem('pendingRequests', JSON.stringify(requests));
        
        // Add system log
        addSystemLog('Admin', 'Rejected request', `Rejected request ${requestId}`);
        
        // Refresh data
        loadPendingRequests();
        loadDashboardData();
        showAlert('Request rejected successfully', 'warning');
    }
}

// Deactivate staff member
function deactivateStaff(staffId) {
    if (confirm('Are you sure you want to deactivate this staff member?')) {
        const staffList = JSON.parse(localStorage.getItem('staffList') || '[]');
        const staffMember = staffList.find(s => s.id === staffId);
        
        if (staffMember) {
            staffMember.status = 'inactive';
            staffMember.deactivatedAt = new Date().toISOString();
            localStorage.setItem('staffList', JSON.stringify(staffList));
            
            // Add system log
            addSystemLog('Admin', 'Deactivated staff', `Deactivated staff member ${staffMember.name}`);
            
            // Refresh data
            loadStaffList();
            loadDashboardData();
            showAlert('Staff member deactivated successfully', 'warning');
        }
    }
}

// Activate staff
function activateStaff(staffId) {
    if (confirm('Are you sure you want to activate this staff member?')) {
        const staffList = JSON.parse(localStorage.getItem('staffList') || '[]');
        const staffMember = staffList.find(s => s.id === staffId);
        if (staffMember) {
            staffMember.status = 'active';
            staffMember.activatedAt = new Date().toISOString();
            localStorage.setItem('staffList', JSON.stringify(staffList));
            addSystemLog('Admin', 'Activated staff', `Activated staff member ${staffMember.name}`);
            loadStaffList();
            loadDashboardData();
            showAlert('Staff member activated successfully', 'success');
        }
    }
}

// Delete staff
function deleteStaff(staffId) {
    if (confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
        let staffList = JSON.parse(localStorage.getItem('staffList') || '[]');
        const staffMember = staffList.find(s => s.id === staffId);
        staffList = staffList.filter(s => s.id !== staffId);
        localStorage.setItem('staffList', JSON.stringify(staffList));
        addSystemLog('Admin', 'Deleted staff', `Deleted staff member ${staffMember ? staffMember.name : staffId}`);
        loadStaffList();
        loadDashboardData();
        showAlert('Staff member deleted successfully', 'danger');
    }
}

// Add system log entry
function addSystemLog(user, action, details) {
    const logs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
    logs.unshift({
        timestamp: new Date().toISOString(),
        user,
        action,
        details
    });
    
    // Keep only last 100 logs
    if (logs.length > 100) {
        logs.pop();
    }
    
    localStorage.setItem('systemLogs', JSON.stringify(logs));
    loadSystemLogs();
}

// Show alert message
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Insert alert at the top of the container
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Update logout function
function logout() {
    // Show confirmation dialog
    if (confirm('Are you sure you want to logout?')) {
        // Add logout log
        addSystemLog('Admin', 'Logged out', 'Admin logged out of the system');
        
        // Clear admin authentication
        localStorage.removeItem('adminAuthenticated');
        
        // Clear any sensitive data
        localStorage.removeItem('currentAdmin');
        
        // Redirect to login page
        window.location.href = '/admin/admin-login.html';
    }
}

// Edit staff function
function editStaff(staffId) {
    const staffList = JSON.parse(localStorage.getItem('staffList') || '[]');
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return;
    document.getElementById('editStaffId').value = staff.id;
    document.getElementById('editStaffName').value = staff.name;
    document.getElementById('editStaffEmail').value = staff.email;
    document.getElementById('editStaffDepartment').value = staff.department;
    document.getElementById('editStaffPassword').value = '';
    const modal = new bootstrap.Modal(document.getElementById('editStaffModal'));
    modal.show();
}

// Save edited staff
function saveEditedStaff() {
    const form = document.getElementById('editStaffForm');
    const staffId = document.getElementById('editStaffId').value;
    const name = document.getElementById('editStaffName').value;
    const email = document.getElementById('editStaffEmail').value;
    const department = document.getElementById('editStaffDepartment').value;
    const password = document.getElementById('editStaffPassword').value;
    let staffList = JSON.parse(localStorage.getItem('staffList') || '[]');
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return;
    // Check for duplicate email (except self)
    if (staffList.some(s => s.email === email && s.id !== staffId)) {
        showAlert('A staff member with this email already exists', 'danger');
        return;
    }
    staff.name = name;
    staff.email = email;
    staff.department = department;
    if (password) staff.password = password;
    localStorage.setItem('staffList', JSON.stringify(staffList));
    addSystemLog('Admin', 'Edited staff', `Edited staff member ${staff.name}`);
    loadStaffList();
    loadDashboardData();
    const modal = bootstrap.Modal.getInstance(document.getElementById('editStaffModal'));
    modal.hide();
    showAlert('Staff member updated successfully', 'success');
} 