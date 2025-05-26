// auth.js - Common authentication functions (Updated to enforce admin password verification)

// Socket.io connection variable
let socket;

// Initialize socket connection
function initializeSocket() {
  // Connect to the socket server
  socket = io('https://hie-1.onrender.com');
  
  // Listen for user deletion events
  socket.on('user-deleted', (data) => {
    // Check if the deleted user ID matches the current user's ID
    const currentUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    
    if (currentUserId === data.userId) {
      console.log('Your account has been deleted by an admin');
      // Show a message to the user
      alert('Your account has been deleted by an administrator. You will be logged out now.');
      // Perform logout
      handleLogout();
    }
  });
}

// Function to check if user is logged in
function checkAuth() {
  const token = localStorage.getItem('userToken');
  const sessionToken = sessionStorage.getItem('userSessionToken');
  const isAdmin = localStorage.getItem('isAdmin') === 'true' || sessionStorage.getItem('isAdmin') === 'true';
  const adminVerified = sessionStorage.getItem('adminVerified') === 'true';
  
  // Initialize socket connection if user is logged in
  if (token || sessionToken) {
    initializeSocket();
  }
  
  // If current page is admin page, check if admin is verified
  if (window.location.href.includes('admin.html')) {
    // Even if the admin token exists, we require verification every time
    // Regular auth check is handled within admin.js itself
    return true;
  }
  
  // For pages that link to admin.html
  const adminLinks = document.querySelectorAll('a[href*="admin.html"]');
  adminLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      // If admin is already verified in this session, proceed directly
      if (isAdmin && adminVerified) {
        window.location.href = 'admin.html';
      } else {
        // Otherwise redirect to admin login
        window.location.href = 'admin.html';
      }
    });
  });
  
  // First check for localStorage token (long-term persistence)
  if (token) {
    // If found in localStorage, also set it in sessionStorage to track the current session
    if (!sessionToken) {
      sessionStorage.setItem('userSessionToken', token);
      sessionStorage.setItem('userName', localStorage.getItem('userName'));
      sessionStorage.setItem('userId', localStorage.getItem('userId')); // Make sure userId is also stored in session
      if (localStorage.getItem('isAdmin')) {
        sessionStorage.setItem('isAdmin', localStorage.getItem('isAdmin'));
        // Note: We don't set adminVerified here, as we want to verify every session
      }
    }
    return true;
  }
  
  // Check sessionStorage token (short-term persistence)
  if (sessionToken) {
    return true;
  }
  
  // If no token found and we're not already on login or admin pages
  if (!window.location.href.includes('login.html') && !window.location.href.includes('admin.html')) {
    // Redirect to login page
    window.location.href = 'login.html';
    return false;
  }
  
  return false;
}

// Function to handle logout
function handleLogout() {
  // Disconnect socket if it exists
  if (socket && socket.connected) {
    socket.disconnect();
  }
  
  // Clear both storage types
  localStorage.removeItem('userToken');
  localStorage.removeItem('userName');
  localStorage.removeItem('isAdmin');
  localStorage.removeItem('userId');
  
  sessionStorage.removeItem('userSessionToken');
  sessionStorage.removeItem('userName');
  sessionStorage.removeItem('isAdmin');
  sessionStorage.removeItem('adminVerified');
  sessionStorage.removeItem('userId');
  
  window.location.href = 'login.html';
}

// Setup welcome message if user is logged in
function setupWelcomeMessage() {
  const userWelcome = document.getElementById('user-welcome');
  // First try to get from sessionStorage, then fall back to localStorage
  const userName = sessionStorage.getItem('userName') || localStorage.getItem('userName');
  
  if (userWelcome && userName) {
    userWelcome.textContent = `Welcome, ${userName}!`;
  }
}

// Add event listeners when DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
  // Check if user is authenticated, but only for protected pages
  if (!window.location.href.includes('login.html') && !window.location.href.includes('admin.html')) {
    // Check if user is authenticated
    if (!checkAuth()) {
      return; // Stop execution if not authenticated (redirect happens in checkAuth)
    }
  }
  
  // Setup welcome message
  setupWelcomeMessage();
  
  // Setup logout button
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  }
});

// Function to validate token with the server (can be enhanced later)
function validateToken() {
  const token = localStorage.getItem('userToken') || sessionStorage.getItem('userSessionToken');
  
  if (!token) {
    return Promise.resolve(false);
  }
  
  // This would call your server to validate the token
  // For now, we'll just assume the token is valid if it exists
  return Promise.resolve(true);
}

// Setup logout button (redundant but kept for compatibility)
const logoutButton = document.getElementById('logout-button');
if (logoutButton) {
  logoutButton.addEventListener('click', handleLogout);
}
