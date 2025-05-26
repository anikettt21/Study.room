// page-protection.js - Add this to each protected page (hall1.html, hall2.html, students.html, registration.html)

// Immediately run auth check when script loads
(function() {
    // Function to check if user is logged in
    function checkPageAuth() {
      const token = localStorage.getItem('userToken');
      const sessionToken = sessionStorage.getItem('userSessionToken');
      
      // If no token found in either storage
      if (!token && !sessionToken) {
        console.log("No authentication token found, redirecting to login");
        // Redirect to login page
        window.location.href = 'login.html';
        return false;
      }
      
      console.log("Authentication token found, user can access this page");
      return true;
    }
    
    // Run auth check immediately
    checkPageAuth();
  })();