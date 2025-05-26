// login.js - Fixed version with comprehensive debugging and fallback

document.addEventListener("DOMContentLoaded", function() {
  console.log("DOM fully loaded - login.js starting");
  
  // Check if user is already logged in
  const token = localStorage.getItem('userToken') || sessionStorage.getItem('userSessionToken');
  const isAdmin = localStorage.getItem('isAdmin') === 'true' || sessionStorage.getItem('isAdmin') === 'true';
  
  if (token) {
    console.log("User already logged in, redirecting...");
    // Redirect authenticated users
    if (isAdmin) {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'index.html';
    }
    return;
  }
  
  // Get form elements
  const loginForm = document.getElementById('login-form');
  const phoneInput = document.getElementById('phone');
  const passwordInput = document.getElementById('password');
  const rememberMeCheckbox = document.getElementById('remember-me');
  const errorMessage = document.getElementById('login-error');
  const loginButton = document.querySelector('#login-form button[type="submit"]') || 
                       document.querySelector('#login-form input[type="submit"]') ||
                       document.querySelector('button[type="submit"]') ||
                       document.querySelector('input[type="submit"]');
  
  // Log all element findings for debugging
  console.log("Form elements check:");
  console.log("- Login form found:", !!loginForm);
  console.log("- Phone input found:", !!phoneInput);
  console.log("- Password input found:", !!passwordInput);
  console.log("- Remember checkbox found:", !!rememberMeCheckbox);
  console.log("- Error message element found:", !!errorMessage);
  console.log("- Submit button found:", !!loginButton);
  
  // DIRECT BUTTON EVENT HANDLER - Add this as a fallback
  if (loginButton) {
    console.log("Adding click event to login button");
    loginButton.addEventListener('click', function(event) {
      event.preventDefault();
      console.log("Login button clicked directly");
      handleLogin();
    });
  } else {
    console.error("CRITICAL: No login button found on page!");
    // Try to find any button on the page as last resort
    const anyButton = document.querySelector('button') || document.querySelector('input[type="button"]');
    if (anyButton) {
      console.log("Found a fallback button, attaching login handler");
      anyButton.addEventListener('click', function(event) {
        event.preventDefault();
        handleLogin();
      });
    }
  }
  
  // FORM SUBMIT EVENT HANDLER
  if (loginForm) {
    console.log("Adding submit event to login form");
    loginForm.addEventListener('submit', function(event) {
      event.preventDefault();
      console.log("Form submission triggered");
      handleLogin();
    });
  } else {
    console.error("CRITICAL: Login form not found! Looking for any form...");
    // Fallback to any form on the page
    const anyForm = document.querySelector('form');
    if (anyForm) {
      console.log("Found a form, attaching login handler");
      anyForm.addEventListener('submit', function(event) {
        event.preventDefault();
        handleLogin();
      });
    } else {
      console.error("No forms found on page at all!");
    }
  }
  
  // Centralized login function
  function handleLogin() {
    console.log("handleLogin function called");
    
    // Get phone from proper input or any input that might contain phone
    let phone = "";
    if (phoneInput) {
      phone = phoneInput.value.trim();
    } else {
      // Try to find an input that might be the phone field
      const possiblePhoneInput = document.querySelector('input[type="tel"]') || 
                                 document.querySelector('input[placeholder*="phone"]') ||
                                 document.querySelector('input[placeholder*="Phone"]') ||
                                 document.querySelector('input[name*="phone"]') ||
                                 document.querySelector('input[name*="Phone"]');
      
      if (possiblePhoneInput) {
        phone = possiblePhoneInput.value.trim();
        console.log("Using alternative phone input:", possiblePhoneInput);
      }
    }
    
    // Get password from proper input or any password input
    let password = "";
    if (passwordInput) {
      password = passwordInput.value;
    } else {
      const possiblePasswordInput = document.querySelector('input[type="password"]');
      if (possiblePasswordInput) {
        password = possiblePasswordInput.value;
        console.log("Using alternative password input:", possiblePasswordInput);
      }
    }
    
    // Get remember me value
    const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;
    
    console.log("Login values collected:");
    console.log("- Phone: " + (phone ? "[PROVIDED]" : "[EMPTY]"));
    console.log("- Password: " + (password ? "[PROVIDED]" : "[EMPTY]"));
    console.log("- Remember me:", rememberMe);
    
    // Validate inputs
    if (!phone || !password) {
      showError('Phone number and password are required');
      return;
    }
    
    // Basic phone validation
    if (!/^[0-9+\- ()]+$/.test(phone)) {
      showError('Invalid phone number format');
      return;
    }
    
    // Set loading state
    setFormLoading(true);
    showError('Attempting login...', 'info');
    
    // Attempt login
    console.log("Sending API request to login endpoint");
    fetch('https://hie-1.onrender.com/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone, password })
    })
    .then(response => {
      console.log("API response received, status:", response.status);
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.message || 'Invalid credentials');
        });
      }
      return response.json();
    })
    .then(data => {
      console.log("API response parsed:", data);
      if (data.success) {
        console.log("Login successful, storing tokens");
        
        // Always store in sessionStorage for current session
        sessionStorage.setItem('userSessionToken', data.token);
        sessionStorage.setItem('userName', data.name || 'User');
        
        // If remember me is checked, also store in localStorage
        if (rememberMe) {
          localStorage.setItem('userToken', data.token);
          localStorage.setItem('userName', data.name || 'User');
        }
        
        showError('Login successful, redirecting...', 'success');
        
        // Redirect to home page
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
      } else {
        showError(data.message || 'Login failed');
      }
    })
    .catch(error => {
      console.error("Login error:", error);
      showError(error.message || 'An error occurred during login');
    })
    .finally(() => {
      setFormLoading(false);
    });
  }
  
  // Function to show error or info message
  function showError(message, type = 'error') {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Try to show in UI element
    if (errorMessage) {
      errorMessage.textContent = message;
      errorMessage.style.display = 'block';
      
      // Set color based on message type
      if (type === 'error') {
        errorMessage.style.color = 'red';
      } else if (type === 'success') {
        errorMessage.style.color = 'green';
      } else {
        errorMessage.style.color = 'blue';
      }
    } else {
      // Fallback: Create a new element for messages
      let msgElement = document.getElementById('dynamic-message');
      
      if (!msgElement) {
        msgElement = document.createElement('div');
        msgElement.id = 'dynamic-message';
        msgElement.style.padding = '10px';
        msgElement.style.margin = '10px 0';
        msgElement.style.borderRadius = '4px';
        msgElement.style.textAlign = 'center';
        
        // Insert at top of body or after form if possible
        if (loginForm) {
          loginForm.parentNode.insertBefore(msgElement, loginForm.nextSibling);
        } else {
          document.body.insertBefore(msgElement, document.body.firstChild);
        }
      }
      
      // Set message and style
      msgElement.textContent = message;
      
      if (type === 'error') {
        msgElement.style.backgroundColor = '#ffebee';
        msgElement.style.color = '#c62828';
        msgElement.style.border = '1px solid #ef9a9a';
      } else if (type === 'success') {
        msgElement.style.backgroundColor = '#e8f5e9';
        msgElement.style.color = '#2e7d32';
        msgElement.style.border = '1px solid #a5d6a7';
      } else {
        msgElement.style.backgroundColor = '#e3f2fd';
        msgElement.style.color = '#1565c0';
        msgElement.style.border = '1px solid #90caf9';
      }
    }
    
    // Also show as alert for critical errors
    if (type === 'error') {
      // Only use alert for critical errors in production
      // alert(message);
    }
  }
  
  // Function to toggle loading state
  function setFormLoading(isLoading) {
    // Update submit button if found
    if (loginButton) {
      loginButton.disabled = isLoading;
      loginButton.textContent = isLoading ? 'Logging in...' : 'Login';
    }
    
    // Update inputs if found
    if (phoneInput) phoneInput.disabled = isLoading;
    if (passwordInput) passwordInput.disabled = isLoading;
    if (rememberMeCheckbox) rememberMeCheckbox.disabled = isLoading;
    
    // Visual indicator
    document.body.style.cursor = isLoading ? 'wait' : 'default';
  }
});
