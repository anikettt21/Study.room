// admin.js - Updated to require password verification before accessing admin panel

document.addEventListener("DOMContentLoaded", function () {
  // Always show the admin login form first, regardless of token status
  document.getElementById("admin-login").style.display = "block";
  document.getElementById("admin-panel").style.display = "none";

  // Check if admin password is set via backend
  fetch("https://hie-1.onrender.com/api/admin/check")
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .catch(err => {
      console.error("Error checking admin:", err);
      document.getElementById("login-error").textContent = "Error connecting to server. Please try again.";
    });
});

// Admin Login - Now required every time
document.getElementById("admin-login-button").addEventListener("click", function () {
  const inputPass = document.getElementById("admin-password-input").value;
  const rememberAdmin = document.getElementById("remember-admin")?.checked || false;
  
  fetch("https://hie-1.onrender.com/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: inputPass })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error("Incorrect password");
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        // Always store in sessionStorage (for current tab/window session)
        sessionStorage.setItem('userSessionToken', 'admin-token');
        sessionStorage.setItem('userName', 'Admin');
        sessionStorage.setItem('isAdmin', 'true');
        sessionStorage.setItem('adminVerified', 'true'); // New flag to track admin verification
        
        // If remember me is checked, also store in localStorage (persistent)
        if (rememberAdmin) {
          localStorage.setItem('userToken', 'admin-token');
          localStorage.setItem('userName', 'Admin');
          localStorage.setItem('isAdmin', 'true');
          // Note: We don't store adminVerified in localStorage as we want to verify every session
        }
        
        // Show admin panel
        document.getElementById("admin-login").style.display = "none";
        document.getElementById("admin-panel").style.display = "block";
        // Load user list after successful login
        loadUserList();
      }
    })
    .catch(err => {
      document.getElementById("login-error").textContent = err.message;
    });
});

// Update the logout function
document.getElementById("logout-admin-button").addEventListener("click", function() {
  // Clear all tokens from both storage types
  localStorage.removeItem('userToken');
  localStorage.removeItem('userName');
  localStorage.removeItem('isAdmin');
  
  sessionStorage.removeItem('userSessionToken');
  sessionStorage.removeItem('userName');
  sessionStorage.removeItem('isAdmin');
  sessionStorage.removeItem('adminVerified');
  
  window.location.href = "index.html";
});

// Set Admin Password
document.getElementById("set-admin-password-button").addEventListener("click", function() {
  const newPass = document.getElementById("new-admin-password").value;
  const messageElement = document.getElementById("admin-password-message");
  
  // Reset message
  messageElement.textContent = "";
  messageElement.className = "message";
  
  if (!newPass) {
    messageElement.textContent = "Please enter a password.";
    messageElement.className = "error-message";
    return;
  }
  
  // Validate password
  const passwordValidation = validatePassword(newPass);
  if (!passwordValidation.valid) {
    messageElement.textContent = passwordValidation.message;
    messageElement.className = "error-message";
    return;
  }
  
  fetch("https://hie-1.onrender.com/api/admin/set-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: newPass })
  })
    .then(response => response.json())
    .then(data => {
      messageElement.textContent = data.message || "Admin password updated successfully";
      messageElement.className = "success-message";
      document.getElementById("new-admin-password").value = "";
    })
    .catch(err => {
      messageElement.textContent = "Error: " + err.message;
      messageElement.className = "error-message";
    });
});

// Add User
document.getElementById("add-user-button").addEventListener("click", function() {
  const name = document.getElementById("user-name").value;
  const phone = document.getElementById("user-phone").value;
  const password = document.getElementById("user-password").value;
  const messageElement = document.getElementById("user-message");
  
  // Reset message
  messageElement.textContent = "";
  messageElement.className = "message";
  
  // Validate inputs
  if (!name || !phone || !password) {
    messageElement.textContent = "All fields are required";
    messageElement.className = "error-message";
    return;
  }
  
  // Validate phone
  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.valid) {
    messageElement.textContent = phoneValidation.message;
    messageElement.className = "error-message";
    return;
  }
  
  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    messageElement.textContent = passwordValidation.message;
    messageElement.className = "error-message";
    return;
  }
  
  // Show loading state
  messageElement.textContent = "Adding user...";
  messageElement.className = "info-message";
  
  fetch("https://hie-1.onrender.com/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone, password, isAdminCreated: true })
  })
  
  .then(response => {
    // Check if the response is JSON before trying to parse it
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json().then(data => {
        if (!response.ok) {
          throw new Error(data.message || "Error adding user");
        }
        return data;
      });
    } else {
      // Not JSON, likely an HTML error page
      throw new Error("Server returned non-JSON response. Please check if the server is running.");
    }
  })

  .then(data => {
    if (data.success) {
      messageElement.textContent = "User added successfully";
      messageElement.className = "success-message";
        // Clear form
        document.getElementById("user-name").value = "";
        document.getElementById("user-phone").value = "";
        document.getElementById("user-password").value = "";
        // Reload user list
        loadUserList();
      } else {
        messageElement.textContent = data.message || "Error adding user";
        messageElement.className = "error-message";
      }
    })
  
    .catch(err => {
      messageElement.textContent = "Error: " + err.message;
      messageElement.className = "error-message";
    });
});

// Load User List
function loadUserList() {
  fetch("https://hie-1.onrender.com/api/users")
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to load users");
      }
      return response.json();
    })
    .then(data => {
      const userList = document.getElementById("user-list");
      const noUsersMessage = document.getElementById("no-users-message");
      
      // Clear current list
      userList.innerHTML = "";
      
      if (data.length === 0) {
        noUsersMessage.style.display = "block";
        return;
      }
      
      noUsersMessage.style.display = "none";
      
      // Populate user list
      data.forEach(user => {
        const row = document.createElement("tr");
        
        const nameCell = document.createElement("td");
        nameCell.textContent = user.name || "N/A";
        
        const phoneCell = document.createElement("td");
        phoneCell.textContent = user.phone;
        
        const actionsCell = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.className = "btn btn-small btn-delete";
        deleteButton.setAttribute('title', 'Delete user');
        deleteButton.addEventListener("click", () => deleteUser(user._id));
        actionsCell.appendChild(deleteButton);
        
        row.appendChild(nameCell);
        row.appendChild(phoneCell);
        row.appendChild(actionsCell);
        
        userList.appendChild(row);
      });
    })
    .catch(err => console.error("Error loading users:", err));
}

// Delete User
function deleteUser(userId) {
  if (!confirm("Are you sure you want to delete this user?")) {
    return;
  }
  
  fetch(`https://hie-1.onrender.com/api/users/${userId}`, {
    method: "DELETE"
  })
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to delete user");
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        loadUserList();
      } else {
        alert(data.message || "Error deleting user");
      }
    })
    .catch(err => {
      console.error("Error deleting user:", err);
      alert("Error deleting user: " + err.message);
    });
}

// Password validation function
function validatePassword(password) {
  // Check length
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }
  
  // Check for letters and numbers
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  
  if (!hasLetters || !hasNumbers) {
    return { valid: false, message: "Password must contain both letters and numbers" };
  }
  
  return { valid: true, message: "Password is valid" };
}

// Phone validation function
function validatePhone(phone) {
  // Basic validation - you can enhance this as needed
  if (!phone) {
    return { valid: false, message: "Phone number is required" };
  }
  
  // Check that it contains only digits, spaces, and some special chars like +, -, ()
  const phoneRegex = /^[0-9+\- ()]+$/;
  if (!phoneRegex.test(phone)) {
    return { valid: false, message: "Invalid phone number format" };
  }
  
  return { valid: true, message: "Phone number is valid" };
}