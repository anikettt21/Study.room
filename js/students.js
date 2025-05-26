// students.js

document.addEventListener('DOMContentLoaded', function () {
    fetchStudents();
    document.getElementById('toggle-cumulative').addEventListener('click', toggleCumulativeView);
    
    // Add media query listener to switch between table and card view
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    handleViewportChange(mediaQuery);
    mediaQuery.addEventListener('change', handleViewportChange);
    
    // Add the expired students check
    checkForExpiringStudents();
    
    // Add dark mode toggle
    setupDarkModeToggle();
    
    // Improve accessibility
    setTimeout(improveAccessibility, 1000); // Allow time for DOM to render
    
    // Add hall filter override
    updateHallJSWithExpiredFilter();
    
    // Add keyboard shortcuts
    setupKeyboardShortcuts();
  });
  
  // Handle viewport change to switch between table and card view
  function handleViewportChange(mediaQuery) {
    if (mediaQuery.matches) {
      // Mobile view - Switch to cards if needed
      const studentTable = document.getElementById('student-data');
      if (studentTable && !document.getElementById('student-cards')) {
        fetchStudents();  // Re-render for mobile
      }
    } else {
      // Desktop view - Use table view
      const studentCards = document.getElementById('student-cards');
      if (studentCards) {
        fetchStudents();  // Re-render for desktop
      }
    }
  }
  
  function fetchStudents() {
    // Show loading indicator
    const normalView = document.getElementById('normal-view');
    if (normalView) {
      normalView.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading students...</p></div>';
    }
    
    fetch('https://hie-1.onrender.com/api/students')
      .then(response => {
        if (!response.ok) throw new Error(`Failed to fetch students. Status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        // First render dashboard metrics using all students data
        renderDashboardMetrics(data);
        
        // Then filter out students who are past their 30-day period for the main list
        const today = new Date();
        const filteredData = data.filter(student => {
          if (student.deleted) return true; // Keep deleted students in the list
          
          const regDate = new Date(student.registration_date);
          const daysSinceRegistration = daysBetween(today, regDate);
          
          // Only show students within their 30-day period
          return daysSinceRegistration <= 30;
        });
        
        renderStudents(filteredData);
      })
      .catch(error => {
        console.error('Error fetching students:', error);
        // Show user-friendly error message
        const normalView = document.getElementById('normal-view');
        if (normalView) {
          normalView.innerHTML = `
            <div class="error-message">
              <h3>Unable to load students</h3>
              <p>${error.message || 'Please check your connection and try again.'}</p>
              <button class="btn" onclick="fetchStudents()">Try Again</button>
            </div>
          `;
        }
      });
  }
  
  function renderStudents(data) {
    // Check if we're on mobile or desktop
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const normalView = document.getElementById('normal-view');
    
    if (isMobile) {
      // Mobile card view
      let cardsHTML = '<div id="student-cards" class="student-cards-container">';
      
      if (data.length === 0) {
        cardsHTML += `
          <div class="student-card">
            <div class="student-card-body">
              <div class="info-row" style="justify-content: center">
                <span>No students found</span>
              </div>
            </div>
          </div>
        `;
      } else {
        data.forEach((student, index) => {
          cardsHTML += `
            <div class="student-card ${student.deleted ? 'deleted-row' : (student.remaining_fees === 'yes' ? 'fees-pending' : '')}"
                 data-student-id="${student._id}">
              <div class="student-card-header">
                <h3>${student.name} ${student.surname}</h3>
                <span>#${index + 1}</span>
              </div>
              <div class="student-card-body">
                <div class="info-row">
                  <span class="info-label">Mobile No.</span>
                  <span class="info-value">${student.phone}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Hall No.</span>
                  <span class="info-value">${student.hall}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Seat No.</span>
                  <span class="info-value">${student.seat_number}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Registration Date</span>
                  <span class="info-value">${new Date(student.registration_date).toLocaleDateString('en-GB')}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Remaining Fees</span>
                  <span class="info-value">
                    <span class="${student.remaining_fees === 'yes' ? 'fees-yes' : 'fees-no'}">
                      ${student.remaining_fees === 'yes' ? student.fees_amount : 'No'}
                    </span>
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-label">Seat Type</span>
                  <span class="info-value">${student.seat_type}</span>
                </div>
              </div>
              <div class="student-card-footer">
                ${student.deleted 
                  ? `<em>Deleted</em> 
                    <button class="delete-btn" onclick="permanentlyDeleteStudent('${student._id}')">Permanent Delete</button>`
                  : `<button class="edit-btn" onclick="editStudent('${student._id}')">Edit</button>
                    <button class="delete-btn" onclick="deleteStudent('${student._id}')">Delete</button>`}
              </div>
            </div>
          `;
        });
      }
      
      cardsHTML += '</div>';
      normalView.innerHTML = cardsHTML;
      
      // Set up expandable cards for mobile
      setTimeout(setupExpandableCards, 100);
      
      // Add swipe interactions for mobile cards
      setupCardSwipeInteractions();
      
      // Add pull-to-refresh
      setupPullToRefresh();
    } else {
      // Desktop table view
      const tbody = document.getElementById('student-data');
      if (!tbody) {
        // Create table if it doesn't exist
        normalView.innerHTML = `
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Name</th>
                  <th>Mobile No.</th>
                  <th>Hall No.</th>
                  <th>Seat No.</th>
                  <th>Registration Date</th>
                  <th>Remaining Fees</th>
                  <th>Seat Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="student-data"></tbody>
            </table>
          </div>
        `;
      }
      
      const tableBody = document.getElementById('student-data');
      tableBody.innerHTML = data.map((student, index) => `
        <tr class="${student.deleted ? 'deleted-row' : ''}">
          <td data-label="No.">${index + 1}</td>
          <td data-label="Name">${student.name} ${student.surname}</td>
          <td data-label="Mobile No.">${student.phone}</td>
          <td data-label="Hall No.">${student.hall}</td>
          <td data-label="Seat No.">${student.seat_number}</td>
          <td data-label="Registration Date">${new Date(student.registration_date).toLocaleDateString('en-GB')}</td>
          <td data-label="Remaining Fees">
            <span class="${student.remaining_fees === 'yes' ? 'fees-yes' : 'fees-no'}">
              ${student.remaining_fees === 'yes' ? student.fees_amount : 'No'}
            </span>
          </td>
          <td data-label="Seat Type">${student.seat_type}</td>
          <td data-label="Actions">
            ${student.deleted 
              ? `<em>Deleted</em> 
                <button class="delete-btn" onclick="permanentlyDeleteStudent('${student._id}')">Permanent Delete</button>`
              : `<button class="edit-btn" onclick="editStudent('${student._id}')">Edit</button>
                <button class="delete-btn" onclick="deleteStudent('${student._id}')">Delete</button>`}
          </td>
        </tr>
      `).join('');
    }
  }
  
  function filterStudents() {
    const searchText = document.getElementById('search-bar').value.toLowerCase();
    const filterMonth = document.getElementById('filter-month').value;
    const filterHall = document.getElementById('filter-hall').value;
    const filterSeatType = document.getElementById('filter-seat-type').value;
    
    fetch('https://hie-1.onrender.com/api/students')
      .then(response => response.json())
      .then(students => {
        const today = new Date();
        
        const filteredData = students.filter(student => {
          // Filter by search, month, hall, and seat type
          const matchesSearch = student.name.toLowerCase().includes(searchText) ||
                                student.phone.includes(searchText) ||
                                (student.email && student.email.toLowerCase().includes(searchText)) ||
                                student.seat_number.toString().includes(searchText);
          const matchesMonth = filterMonth ? 
              new Date(student.registration_date).toLocaleString('default', { month: 'long' }) === filterMonth : true;
          const matchesHall = filterHall !== 'all' ? student.hall === filterHall : true;
          const matchesSeatType = filterSeatType ? student.seat_type === filterSeatType : true;
          
          // Keep deleted students in the list but filter out pending removal students
          if (!student.deleted) {
            const regDate = new Date(student.registration_date);
            const daysSinceRegistration = daysBetween(today, regDate);
            
            // Only show students within their 30-day period in the main list
            return matchesSearch && matchesMonth && matchesHall && matchesSeatType && daysSinceRegistration <= 30;
          }
          
          return matchesSearch && matchesMonth && matchesHall && matchesSeatType;
        });
        
        renderStudents(filteredData);
      })
      .catch(error => console.error('Error filtering students:', error));
  }
    
  // Helper for admin verification using backend API.
  function verifyAdmin() {
    return new Promise((resolve, reject) => {
      const adminPass = prompt("Enter Admin Password:");
      fetch("https://hie-1.onrender.com/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPass })
      })
        .then(response => {
          if (!response.ok) throw new Error("Incorrect admin password.");
          return response.json();
        })
        .then(() => resolve())
        .catch(err => {
          alert(err.message);
          reject();
        });
    });
  }
    
  function editStudent(id) {
    verifyAdmin()
      .then(() => {
        window.location.href = `registration.html?edit=${id}`;
      })
      .catch(() => {
        console.error("Admin verification failed for editing.");
      });
  }
    
  // Toast Notification System
  function showToast(message, type = 'info', title = '', duration = 5000) {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Create toast content
    let iconHtml = '';
    switch(type) {
      case 'success':
        iconHtml = '<div class="toast-icon">✓</div>';
        title = title || 'Success';
        break;
      case 'error':
        iconHtml = '<div class="toast-icon">✕</div>';
        title = title || 'Error';
        break;
      case 'warning':
        iconHtml = '<div class="toast-icon">⚠</div>';
        title = title || 'Warning';
        break;
      default:
        iconHtml = '<div class="toast-icon">ℹ</div>';
        title = title || 'Information';
    }
    
    toast.innerHTML = `
      ${iconHtml}
      <div class="toast-content">
        <h4>${title}</h4>
        <p>${message}</p>
      </div>
      <button class="toast-close" onclick="this.parentElement.classList.add('hide');">&times;</button>
    `;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Remove toast after duration
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast);
        }
      }, 300); // Match the animation duration
    }, duration);
  }
    
  function deleteStudent(id) {
    verifyAdmin()
      .then(() => {
        if (confirm('Are you sure you want to delete this student?')) {
          fetch(`https://hie-1.onrender.com/api/students/${id}`, { method: 'DELETE' })
            .then(response => {
              if (!response.ok) throw new Error("Failed to delete student.");
              return response.json();
            })
            .then(data => {
              showToast(data.message, 'success');
              fetchStudents();
            })
            .catch(error => {
              console.error('Error deleting student:', error);
              showToast(error.message || 'Error deleting student', 'error');
            });
        }
      })
      .catch(() => {
        console.error("Admin verification failed for deletion.");
        showToast('Admin verification failed', 'error');
      });
  }
    
  // New: Permanently delete a student (for already soft-deleted students)
  function permanentlyDeleteStudent(id) {
    verifyAdmin()
      .then(() => {
        if (confirm("Are you sure you want to permanently delete this student? This action cannot be undone.")) {
          fetch(`https://hie-1.onrender.com/api/students/permanent/${id}`, { method: 'DELETE' })
            .then(response => {
              if (!response.ok) throw new Error("Failed to permanently delete student.");
              return response.json();
            })
            .then(data => {
              showToast(data.message, 'success');
              fetchStudents();
            })
            .catch(error => {
              console.error("Error permanently deleting student:", error);
              showToast(error.message || 'Error permanently deleting student', 'error');
            });
        }
      })
      .catch(() => {
        console.error("Admin verification failed for permanent deletion.");
        showToast('Admin verification failed', 'error');
      });
  }
    
  // --- Cumulative (Timeline) View ---
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    
  function renderCumulativeStudents() {
    const searchText = document.getElementById('search-bar').value.toLowerCase();
    const filterHall = document.getElementById('filter-hall').value;
    const filterSeatType = document.getElementById('filter-seat-type').value;
    
    fetch('https://hie-1.onrender.com/api/students')
      .then(response => response.json())
      .then(allStudents => {
        const today = new Date();
        
        let students = allStudents.filter(student => {
          // Filter for search text, hall, and seat type
          const matchesSearch = student.name.toLowerCase().includes(searchText) ||
                                student.phone.includes(searchText) ||
                                (student.email && student.email.toLowerCase().includes(searchText)) ||
                                student.seat_number.toString().includes(searchText);
          const matchesHall = filterHall !== 'all' ? student.hall === filterHall : true;
          const matchesSeatType = filterSeatType ? student.seat_type === filterSeatType : true;
          
          // Calculate days since registration
          const regDate = new Date(student.registration_date);
          const daysSinceRegistration = daysBetween(today, regDate);
          
          // For cumulative view, we include all students, but we'll mark expired ones
          const isActive = !student.deleted && (daysSinceRegistration <= 30);
          const isPendingRemoval = !student.deleted && (daysSinceRegistration > 30 && daysSinceRegistration <= 60);
          
          return matchesSearch && matchesHall && matchesSeatType && (isActive || isPendingRemoval || student.deleted);
        });
        
        students.sort((a, b) => new Date(a.registration_date) - new Date(b.registration_date));
        
        let uniqueMonths = [
          ...new Set(
            students.map(s => parseInt(s.registration_date.split("-")[1], 10))
          )
        ];
        uniqueMonths.sort((a, b) => a - b);
        
        let html = "";
        uniqueMonths.forEach((monthNum) => {
          const cumulativeStudents = students.filter(s => {
            const regMonth = parseInt(s.registration_date.split("-")[1], 10);
            return regMonth <= monthNum;
          });
          if (cumulativeStudents.length > 0) {
            const monthName = monthNames[monthNum - 1];
            html += `<h3>${monthName}</h3>`;
            html += `<table class="cumulative-table"><thead><tr>
                      <th>#</th><th>Name</th><th>Phone</th><th>Hall</th><th>Seat</th><th>Reg Date</th><th>Status</th>
                     </tr></thead><tbody>`;
            cumulativeStudents.forEach((s, i) => {
              // Determine student status for styling
              const regDate = new Date(s.registration_date);
              const daysSinceRegistration = daysBetween(today, regDate);
              const statusClass = s.deleted ? 'deleted-row' : 
                                (daysSinceRegistration > 30 && daysSinceRegistration <= 60) ? 'pending-removal-row' : '';
              
              const statusText = s.deleted ? 'Deleted' : 
                               (daysSinceRegistration > 30 && daysSinceRegistration <= 60) ? 'Pending Removal' : 'Active';
              
              html += `<tr class="${statusClass}">
                        <td data-label="#">${i + 1}</td>
                        <td data-label="Name">${s.name} ${s.surname}</td>
                        <td data-label="Phone">${s.phone}</td>
                        <td data-label="Hall">${s.hall}</td>
                        <td data-label="Seat">${s.seat_number}</td>
                        <td data-label="Reg Date">${new Date(s.registration_date).toLocaleDateString('en-GB')}</td>
                        <td data-label="Status">${statusText}</td>
                      </tr>`;
            });
            html += `</tbody></table>`;
          }
        });
        document.getElementById("cumulative-container").innerHTML = html;
      })
      .catch(err => console.error("Error fetching cumulative students:", err));
  }
    
  function toggleCumulativeView() {
    const cumulativeContainer = document.getElementById("cumulative-container");
    const normalContainer = document.getElementById("normal-view");
    const toggleButton = document.getElementById("toggle-cumulative");
    
    if (cumulativeContainer.style.display === "none" || cumulativeContainer.style.display === "") {
      // Show cumulative view
      cumulativeContainer.style.display = "block";
      normalContainer.style.display = "none";
      
      // Update ARIA states
      toggleButton.setAttribute("aria-expanded", "true");
      
      // Add a class for styling
      toggleButton.classList.add("active");
      
      // Set focus to the cumulative container for accessibility
      cumulativeContainer.setAttribute("tabindex", "-1");
      cumulativeContainer.focus();
      
      // Show toast notification
      showToast("Cumulative view enabled", "info");
      
      // Render the cumulative data
      renderCumulativeStudents();
    } else {
      // Show normal view
      cumulativeContainer.style.display = "none";
      normalContainer.style.display = "block";
      
      // Update ARIA states
      toggleButton.setAttribute("aria-expanded", "false");
      
      // Remove active class
      toggleButton.classList.remove("active");
      
      // Set focus back to normal view
      normalContainer.setAttribute("tabindex", "-1");
      normalContainer.focus();
      
      // Show toast notification
      showToast("Standard view enabled", "info");
    }
  }
  
  // Add this function to students.js
  function checkForExpiringStudents() {
    fetch('https://hie-1.onrender.com/api/students')
      .then(response => response.json())
      .then(students => {
        const today = new Date();
        
        // Find students in different expiration phases
        const pendingRemovalStudents = students.filter(student => {
          if (student.deleted) return false;
          
          const regDate = new Date(student.registration_date);
          const daysSinceRegistration = daysBetween(today, regDate);
          
          // Students in the pending removal period (between 30-60 days)
          return daysSinceRegistration > 30 && daysSinceRegistration <= 60;
        });
        
        // Display notification badge if there are students pending removal
        if (pendingRemovalStudents.length > 0) {
          const headerNav = document.querySelector('.nav-buttons');
          if (!headerNav) return;
          
          // Only add if it doesn't already exist
          if (!document.querySelector('.expired-link')) {
            const expiredLink = document.createElement('a');
            expiredLink.href = 'expired-students.html';
            expiredLink.className = 'btn btn-outline expired-link';
            expiredLink.innerHTML = `Pending Removal`;
            expiredLink.style.position = 'relative';
            
            const badge = document.createElement('span');
            badge.className = 'badge';
            badge.textContent = pendingRemovalStudents.length;
            badge.style.position = 'absolute';
            badge.style.top = '-8px';
            badge.style.right = '-8px';
            badge.style.backgroundColor = '#e74c3c';
            badge.style.color = 'white';
            badge.style.borderRadius = '50%';
            badge.style.padding = '2px 6px';
            badge.style.fontSize = '12px';
            
            expiredLink.appendChild(badge);
            headerNav.appendChild(expiredLink);
          } else {
            // Update the count if the link already exists
            const badge = document.querySelector('.expired-link .badge');
            if (badge) {
              badge.textContent = pendingRemovalStudents.length;
            }
          }
        }
        
        // Set up an interval to periodically check for students entering pending removal status
        // This ensures the list updates automatically when students reach 30 days
        if (!window.expiryCheckInterval) {
          window.expiryCheckInterval = setInterval(() => {
            fetchStudents(); // Refresh the student list
          }, 60000); // Check every minute
        }
      })
      .catch(error => console.error('Error checking for expiring students:', error));
  }
  
  // Helper function to calculate days between dates
  function daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    const firstDate = new Date(date1);
    const secondDate = new Date(date2);
    return Math.round(Math.abs((firstDate - secondDate) / oneDay));
  }

// Add this function to update hall.js with expired student filtering
function updateHallJSWithExpiredFilter() {
  // This creates a JavaScript function to be executed when hall pages load
  // It overrides the loadHallData function in hall.js to filter out expired students
  
  if (window.location.pathname.includes('hall1.html') || window.location.pathname.includes('hall2.html')) {
    if (typeof loadHallData === 'function') {
      const originalLoadHallData = loadHallData;
      
      // Override the loadHallData function
      loadHallData = function() {
        hall = window.location.pathname.includes('hall1') ? 'hall1' : 'hall2';
        // Retrieve removed seats and totalSeats from localStorage (or defaults)
        removedSeats = JSON.parse(localStorage.getItem("removedSeats_" + hall)) || [];
        permanentlyRemovedSeats = JSON.parse(localStorage.getItem("permanentlyRemovedSeats_" + hall)) || [];
        totalSeats = parseInt(localStorage.getItem("totalSeats_" + hall)) || 50;

        // Fetch all students from backend and filter by hall
        fetch('https://hie-1.onrender.com/api/students')
          .then(response => response.json())
          .then(students => {
            const today = new Date();
            
            // For the hall display, only show seats of active students (not deleted and not in the removal period)
            soldSeats = students.filter(s => {
              if (s.hall !== hall || s.deleted) return false;
              
              // Check if student is in the removal period (between 30-60 days)
              const regDate = new Date(s.registration_date);
              const daysSinceRegistration = daysBetween(today, regDate);
              
              // Only include students in their first 30 days (active period)
              return daysSinceRegistration <= 30;
            }).map(s => s.seat_number);
            
            const maxSold = soldSeats.length > 0 ? Math.max(...soldSeats) : 0;
            totalSeats = Math.max(totalSeats, 50, maxSold);
            renderSeats();
          })
          .catch(err => console.error("Error fetching students:", err));
      };
    }
  }
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', function() {
  updateHallJSWithExpiredFilter();
});

// Enhanced renderDashboardMetrics with clickable metrics
function renderDashboardMetrics(students) {
  const today = new Date();
  
  // Calculate metrics
  const totalActiveStudents = students.filter(s => !s.deleted && daysBetween(today, new Date(s.registration_date)) <= 30).length;
  
  const pendingFeesStudents = students.filter(s => !s.deleted && s.remaining_fees === 'yes' && daysBetween(today, new Date(s.registration_date)) <= 30).length;
  
  const pendingRemovalStudents = students.filter(s => !s.deleted && 
    (daysBetween(today, new Date(s.registration_date)) > 30 && daysBetween(today, new Date(s.registration_date)) <= 60)).length;
  
  // Calculate hall occupancy 
  const totalHallCapacity = 100; // Assuming 50 seats each in 2 halls
  const occupancyRate = Math.round((totalActiveStudents / totalHallCapacity) * 100);
  
  // Create the HTML for dashboard - now with clickable metrics
  let dashboardHTML = `
    <div class="dashboard-metrics">
      <div class="metric-card">
        <div class="metric-icon">👨‍🎓</div>
        <h3>${totalActiveStudents}</h3>
        <p>Active Students</p>
      </div>
      <div class="metric-card clickable" onclick="filterByPendingFees()">
        <div class="metric-icon">💰</div>
        <h3>${pendingFeesStudents}</h3>
        <p>Pending Fees</p>
      </div>
      <div class="metric-card clickable" onclick="window.location.href='expired-students.html'">
        <div class="metric-icon">⏳</div>
        <h3>${pendingRemovalStudents}</h3>
        <p>Pending Removal</p>
      </div>
      <div class="metric-card">
        <div class="metric-icon">📊</div>
        <h3>${occupancyRate}%</h3>
        <p>Occupancy Rate</p>
      </div>
    </div>
  `;
  
  // Add the dashboard to the top of the container
  const container = document.querySelector('.students-container');
  
  if (container && !document.querySelector('.dashboard-metrics')) {
    // Only add if it doesn't already exist
    const filterContainer = document.querySelector('.filter-container');
    if (filterContainer) {
      filterContainer.insertAdjacentHTML('beforebegin', dashboardHTML);
    } else {
      container.insertAdjacentHTML('afterbegin', dashboardHTML);
    }
  } else if (container && document.querySelector('.dashboard-metrics')) {
    // Update values if dashboard already exists
    const metricsContainer = document.querySelector('.dashboard-metrics');
    const metricValues = metricsContainer.querySelectorAll('h3');
    if (metricValues.length >= 4) {
      metricValues[0].textContent = totalActiveStudents;
      metricValues[1].textContent = pendingFeesStudents;
      metricValues[2].textContent = pendingRemovalStudents;
      metricValues[3].textContent = `${occupancyRate}%`;
    }
  }
  
  // Add styling for clickable metrics
  const style = document.createElement('style');
  if (!document.querySelector('style#metrics-style')) {
    style.id = 'metrics-style';
    style.textContent = `
      .metric-card.clickable {
        cursor: pointer;
        transition: transform 0.2s ease;
      }
      .metric-card.clickable:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
      }
      .metric-card.clickable:after {
        content: '🔍 Click to view';
        display: block;
        font-size: 0.8rem;
        margin-top: 5px;
        color: var(--primary-color);
      }
    `;
    document.head.appendChild(style);
  }
}

// Filter students with pending fees
function filterByPendingFees() {
  const searchBar = document.getElementById('search-bar');
  if (searchBar) {
    searchBar.value = '';
  }
  
  // Set the filter to show only pending fees students
  fetch('https://hie-1.onrender.com/api/students')
    .then(response => response.json())
    .then(students => {
      const today = new Date();
      
      const filteredData = students.filter(student => {
        if (student.deleted) return false;
        
        const regDate = new Date(student.registration_date);
        const daysSinceRegistration = daysBetween(today, regDate);
        
        // Only include active students with pending fees
        return daysSinceRegistration <= 30 && student.remaining_fees === 'yes';
      });
      
      renderStudents(filteredData);
      showToast('Showing students with pending fees', 'info');
    })
    .catch(error => {
      console.error('Error filtering pending fees students:', error);
      showToast('Failed to filter students', 'error');
    });
}

// Enhance mobile card view with expandable cards
function setupExpandableCards() {
  // For mobile view, make cards expandable
  if (window.matchMedia('(max-width: 768px)').matches) {
    const cards = document.querySelectorAll('.student-card');
    
    cards.forEach(card => {
      // Remove existing click listeners
      card.removeEventListener('click', toggleCardExpansion);
      
      // Add click listener
      card.addEventListener('click', toggleCardExpansion);
    });
  }
}

// Toggle card expansion function
function toggleCardExpansion(e) {
  // Don't expand if clicking on a button or link
  if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') {
    return;
  }
  
  const card = this.closest('.student-card');
  card.classList.toggle('expanded');
}

// Add pull-to-refresh functionality for mobile
function setupPullToRefresh() {
  let touchStartY = 0;
  let touchEndY = 0;
  const minSwipeDistance = 80;
  let refreshing = false;
  const container = document.querySelector('.students-container');
  
  if (!container) return;
  
  // Create refresh indicator
  const refreshIndicator = document.createElement('div');
  refreshIndicator.className = 'pull-refresh-indicator';
  refreshIndicator.innerHTML = `
    <div class="pull-arrow">↓</div>
    <div class="pull-text">Pull down to refresh</div>
  `;
  container.insertAdjacentElement('afterbegin', refreshIndicator);
  
  // Touch start event
  container.addEventListener('touchstart', function(e) {
    if (window.scrollY === 0 && !refreshing) {
      touchStartY = e.touches[0].clientY;
      refreshIndicator.classList.add('visible');
    }
  }, { passive: true });
  
  // Touch move event
  container.addEventListener('touchmove', function(e) {
    if (refreshing) return;
    
    if (window.scrollY === 0) {
      touchEndY = e.touches[0].clientY;
      const distance = touchEndY - touchStartY;
      
      if (distance > 0 && distance < 200) {
        refreshIndicator.style.transform = `translateY(${distance / 2}px)`;
        
        if (distance > minSwipeDistance) {
          refreshIndicator.classList.add('ready');
          refreshIndicator.querySelector('.pull-text').textContent = 'Release to refresh';
        } else {
          refreshIndicator.classList.remove('ready');
          refreshIndicator.querySelector('.pull-text').textContent = 'Pull down to refresh';
        }
      }
    }
  }, { passive: true });
  
  // Touch end event
  container.addEventListener('touchend', function() {
    if (refreshing) return;
    
    const distance = touchEndY - touchStartY;
    
    if (distance > minSwipeDistance && window.scrollY === 0) {
      refreshing = true;
      refreshIndicator.classList.add('refreshing');
      refreshIndicator.classList.remove('ready');
      refreshIndicator.querySelector('.pull-text').textContent = 'Refreshing...';
      refreshIndicator.style.transform = 'translateY(40px)';
      
      // Perform refresh
      fetchStudents().then(() => {
        // Reset after refresh completed
        setTimeout(() => {
          refreshing = false;
          refreshIndicator.style.transform = 'translateY(-60px)';
          refreshIndicator.classList.remove('refreshing', 'visible');
        }, 1000);
      });
    } else {
      // Reset without refreshing
      refreshIndicator.style.transform = 'translateY(-60px)';
      refreshIndicator.classList.remove('ready', 'visible');
    }
  }, { passive: true });
}

// Add swipe interactions to student cards
function setupCardSwipeInteractions() {
  const cards = document.querySelectorAll('.student-card');
  let touchStartX = 0;
  let touchEndX = 0;
  const minSwipeDistance = 100;
  
  cards.forEach(card => {
    // Touch start
    card.addEventListener('touchstart', function(e) {
      touchStartX = e.touches[0].clientX;
      card.style.transition = '';
    }, { passive: true });
    
    // Touch move
    card.addEventListener('touchmove', function(e) {
      touchEndX = e.touches[0].clientX;
      const distance = touchEndX - touchStartX;
      
      // Limit swipe to left side only (for revealing actions)
      if (distance < 0 && distance > -150) {
        card.style.transform = `translateX(${distance}px)`;
      }
    }, { passive: true });
    
    // Touch end
    card.addEventListener('touchend', function() {
      const distance = touchEndX - touchStartX;
      card.style.transition = 'transform 0.3s ease';
      
      if (distance < -minSwipeDistance) {
        // Swipe left - reveal actions
        card.style.transform = 'translateX(-100px)';
        
        // Add a tap anywhere else to close
        const closeSwipe = function(e) {
          if (!card.contains(e.target) || !e.target.closest('.student-card-footer')) {
            card.style.transform = 'translateX(0)';
            document.removeEventListener('touchstart', closeSwipe);
          }
        };
        
        document.addEventListener('touchstart', closeSwipe, { passive: true });
      } else {
        // Reset position
        card.style.transform = 'translateX(0)';
      }
    }, { passive: true });
  });
}

// Dark Mode Toggle
function setupDarkModeToggle() {
  // Create the toggle button if it doesn't exist
  if (!document.querySelector('.dark-mode-toggle')) {
    const darkModeToggle = document.createElement('button');
    darkModeToggle.className = 'dark-mode-toggle';
    darkModeToggle.setAttribute('aria-label', 'Toggle dark mode');
    darkModeToggle.innerHTML = '🌙';
    document.body.appendChild(darkModeToggle);
    
    // Check for saved preference
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
      darkModeToggle.innerHTML = '☀️';
    }
    
    // Add click event
    darkModeToggle.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark-mode');
      const isDark = document.documentElement.classList.contains('dark-mode');
      localStorage.setItem('darkMode', isDark);
      darkModeToggle.innerHTML = isDark ? '☀️' : '🌙';
      
      // Show toast notification
      showToast(`Dark mode ${isDark ? 'enabled' : 'disabled'}`, 'info');
    });
  }
}

// Add ARIA attributes for improved accessibility
function improveAccessibility() {
  // Add proper ARIA roles to tables
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    if (!table.getAttribute('role')) {
      table.setAttribute('role', 'grid');
      
      const headers = table.querySelectorAll('th');
      headers.forEach((header, index) => {
        header.setAttribute('role', 'columnheader');
        header.setAttribute('id', `col-${index}`);
      });
      
      const cells = table.querySelectorAll('td');
      cells.forEach((cell, index) => {
        const colIndex = index % headers.length;
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-labelledby', `col-${colIndex}`);
      });
    }
  });
  
  // Add proper ARIA labels to form elements
  const inputs = document.querySelectorAll('input, select');
  inputs.forEach(input => {
    const label = input.getAttribute('placeholder');
    if (label && !input.getAttribute('aria-label')) {
      input.setAttribute('aria-label', label);
    }
  });
  
  // Make cards keyboard navigable
  const cards = document.querySelectorAll('.student-card');
  cards.forEach((card, index) => {
    if (!card.getAttribute('tabindex')) {
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'article');
      card.setAttribute('aria-label', `Student ${index + 1} information`);
      
      // Add keyboard interaction
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const expandBtn = card.querySelector('.edit-btn');
          if (expandBtn) expandBtn.click();
        }
      });
    }
  });
}

// Add keyboard shortcuts for power users
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    // Only apply shortcuts when not focused on input elements
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }
    
    // Ctrl+F or Cmd+F: Focus on search box
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      const searchBar = document.getElementById('search-bar');
      if (searchBar) {
        searchBar.focus();
        showToast('Search bar focused', 'info', 'Keyboard Shortcut');
      }
    }
    
    // R: Refresh list
    if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      fetchStudents();
      showToast('Refreshing student list', 'info', 'Keyboard Shortcut');
    }
    
    // T: Toggle cumulative view
    if (e.key === 't' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      toggleCumulativeView();
      showToast('Toggled view mode', 'info', 'Keyboard Shortcut');
    }
    
    // D: Toggle dark mode
    if (e.key === 'd' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const darkModeToggle = document.querySelector('.dark-mode-toggle');
      if (darkModeToggle) darkModeToggle.click();
    }
  });
  
  // Show keyboard shortcut helper on ? key
  document.addEventListener('keydown', function(e) {
    if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      showKeyboardShortcutsHelp();
    }
  });
}

// Show keyboard shortcuts help
function showKeyboardShortcutsHelp() {
  const helpHTML = `
    <div class="keyboard-shortcuts-help">
      <h3>Keyboard Shortcuts</h3>
      <div class="shortcut-row">
        <div class="shortcut-key">Ctrl+F / ⌘+F</div>
        <div class="shortcut-desc">Focus search bar</div>
      </div>
      <div class="shortcut-row">
        <div class="shortcut-key">R</div>
        <div class="shortcut-desc">Refresh student list</div>
      </div>
      <div class="shortcut-row">
        <div class="shortcut-key">T</div>
        <div class="shortcut-desc">Toggle cumulative view</div>
      </div>
      <div class="shortcut-row">
        <div class="shortcut-key">D</div>
        <div class="shortcut-desc">Toggle dark mode</div>
      </div>
      <div class="shortcut-row">
        <div class="shortcut-key">?</div>
        <div class="shortcut-desc">Show this help</div>
      </div>
      <button class="close-btn">Close</button>
    </div>
  `;
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'keyboard-shortcuts-modal';
  modal.innerHTML = helpHTML;
  document.body.appendChild(modal);
  
  // Add close button event
  modal.querySelector('.close-btn').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  // Close on ESC key
  document.addEventListener('keydown', function closeOnEsc(e) {
    if (e.key === 'Escape') {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
      document.removeEventListener('keydown', closeOnEsc);
    }
  });
  
  // Close on outside click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}
