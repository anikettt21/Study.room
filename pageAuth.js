// pageAuth.js - Authentication check for hall1.html, hall2.html, registration.html, and students.html

document.addEventListener("DOMContentLoaded", function() {
    // Check if user is authenticated
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userSessionToken');
    
    // List of protected pages that require authentication
    const protectedPages = [
      'hall1.html',
      'hall2.html',
      'registration.html',
      'students.html'
    ];
    
    // Get current page filename
    const currentPage = window.location.pathname.split('/').pop();
    
    // Check if current page is in the protected pages list
    if (protectedPages.includes(currentPage)) {
      console.log("Protected page detected:", currentPage);
      
      // If no token found, redirect to login page
      if (!token) {
        console.log("No authentication token found, redirecting to login page");
        window.location.href = 'login.html';
        return;
      }
      
      // Optional: You could add server-side token validation here
      // validateToken().then(isValid => {
      //   if (!isValid) {
      //     console.log("Invalid token, redirecting to login page");
      //     handleLogout();
      //     window.location.href = 'login.html';
      //   }
      // });
    }
    
    // For all pages: Setup logout button if it exists
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', handleLogout);
    }
    
    // For all pages: Setup welcome message if it exists
    setupWelcomeMessage();
  });
  
  // Function to handle logout
  function handleLogout() {
    // Clear both storage types
    localStorage.removeItem('userToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('isAdmin');
    
    sessionStorage.removeItem('userSessionToken');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('isAdmin');
    sessionStorage.removeItem('adminVerified');
    
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