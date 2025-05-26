// hall.js

let hall = "";
let soldSeats = []; // Derived from student registrations fetched from the backend
let soldSeatTypes = {}; // To store seat types for each sold seat
// Removed seats arrays are maintained locally for now.
let removedSeats = JSON.parse(localStorage.getItem("removedSeats_" + (window.location.pathname.includes('hall1') ? 'hall1' : 'hall2'))) || [];
let permanentlyRemovedSeats = JSON.parse(localStorage.getItem("permanentlyRemovedSeats_" + (window.location.pathname.includes('hall1') ? 'hall1' : 'hall2'))) || [];
let totalSeats = parseInt(localStorage.getItem("totalSeats_" + (window.location.pathname.includes('hall1') ? 'hall1' : 'hall2'))) || 50;

// Helper: Extract month name from a "YYYY-MM-DD" date string.
function getMonthFromDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleString('default', { month: 'long' });
}

// Helper: Calculate days between two dates
function daysBetween(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  return Math.round(Math.abs((date1 - date2) / oneDay));
}

// Load hall-specific data by fetching sold seats from the backend.
function loadHallData() {
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
      
      // Filter students to only show active ones (not deleted and within 30 days)
      const activeStudents = students.filter(s => {
        if (s.hall !== hall || s.deleted) return false;
        
        // Calculate days since registration
        const regDate = new Date(s.registration_date);
        const daysSinceRegistration = daysBetween(today, regDate);
        
        // Only include students within their 30-day period
        return daysSinceRegistration <= 30;
      });

      // Store seat numbers and their types
      soldSeats = [];
      soldSeatTypes = {};
      activeStudents.forEach(s => {
        // Only mark fixed seats as occupied
        if (s.seat_type === 'fixed') {
          soldSeats.push(s.seat_number);
        }
        soldSeatTypes[s.seat_number] = s.seat_type;
      });

      const maxSold = soldSeats.length > 0 ? Math.max(...soldSeats) : 0;
      totalSeats = Math.max(totalSeats, 50, maxSold);
      renderSeats();
    })
    .catch(err => console.error("Error fetching students:", err));
}

// Render the seat layout based on current data.
function renderSeats() {
  const seatLayout = document.getElementById('seat-layout');
  seatLayout.innerHTML = '';
  for (let i = 1; i <= totalSeats; i++) {
    const seat = document.createElement('div');
    seat.classList.add('seat');
    
    // Create elements for the seat number and status
    const seatNumber = document.createElement('span');
    seatNumber.textContent = i;
    seatNumber.classList.add('seat-number');
    seat.appendChild(seatNumber);
    
    // Add a small status label
    const statusLabel = document.createElement('span');
    statusLabel.classList.add('status-label');
    
    if (soldSeats.includes(i)) {
      seat.classList.add('sold');
      statusLabel.textContent = 'Occupied (Fixed)';
    } else if (soldSeatTypes[i] === 'non-fixed') {
      seat.classList.add('available');
      statusLabel.textContent = 'Non-Fixed';
    } else if (isSeatRemoved(i, permanentlyRemovedSeats)) {
      seat.classList.add('removed-permanent');
      statusLabel.textContent = 'Unavailable';
      addEditIcon(seat, i);
    } else if (isSeatRemoved(i, removedSeats)) {
      seat.classList.add('removed');
      statusLabel.textContent = 'Removed';
      addEditIcon(seat, i);
    } else {
      seat.classList.add('available');
      statusLabel.textContent = 'Available';
    }
    
    seat.appendChild(statusLabel);
    seatLayout.appendChild(seat);
  }
}

// Helper: Check if a seat (number) is in an array of removal objects.
function isSeatRemoved(seatNumber, removalArray) {
  return removalArray.some(item => item.seat === seatNumber);
}

// Load data and render seats.
function fetchAndRenderSeats() {
  loadHallData();
}

// Helper: Add a pencil (edit) icon to a removed seat.
function addEditIcon(seatElement, seatNumber) {
  const editIcon = document.createElement('span');
  editIcon.className = 'edit-icon';
  editIcon.innerHTML = '<i class="fas fa-edit"></i>'; // Using Font Awesome icon
  editIcon.addEventListener('click', function (e) {
    e.stopPropagation();
    handleEditSeat(seatNumber);
  });
  seatElement.appendChild(editIcon);
}

// Handle editing a seat (restore or mark as permanently removed)
function handleEditSeat(seatNumber) {
  const choice = prompt(`For seat ${seatNumber}:\nEnter 1 to restore this seat.\nEnter 2 to mark it permanently removed.`);
  if (choice === "1") {
    // Restore: remove any removal records for this seat.
    removedSeats = removedSeats.filter(item => item.seat !== seatNumber);
    permanentlyRemovedSeats = permanentlyRemovedSeats.filter(item => item.seat !== seatNumber);
  } else if (choice === "2") {
    // Permanently remove: remove from temporary array then add to permanent array if not already present.
    removedSeats = removedSeats.filter(item => item.seat !== seatNumber);
    if (!isSeatRemoved(seatNumber, permanentlyRemovedSeats)) {
      permanentlyRemovedSeats.push({ seat: seatNumber, removalDate: new Date().toISOString() });
    }
  }
  localStorage.setItem("removedSeats_" + hall, JSON.stringify(removedSeats));
  localStorage.setItem("permanentlyRemovedSeats_" + hall, JSON.stringify(permanentlyRemovedSeats));
  renderSeats();
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

// PLUS button: Add/restore a seat.
document.getElementById('add-seat-button').addEventListener('click', function () {
  verifyAdmin().then(() => {
    const seatInput = prompt("Enter the seat number to add/restore:");
    if (seatInput === null) return;
    const seatNumber = parseInt(seatInput, 10);
    if (isNaN(seatNumber) || seatNumber < 1) {
      alert("Invalid seat number.");
      return;
    }
    if (soldSeats.includes(seatNumber)) {
      alert("This seat is sold and cannot be restored.");
      return;
    }
    if (seatNumber > totalSeats) {
      totalSeats = seatNumber;
      localStorage.setItem('totalSeats_' + hall, totalSeats);
    } else {
      if (!isSeatRemoved(seatNumber, removedSeats) && !isSeatRemoved(seatNumber, permanentlyRemovedSeats)) {
        alert("This seat is already available.");
        return;
      }
      // Remove removal record for restoration.
      removedSeats = removedSeats.filter(item => item.seat !== seatNumber);
      permanentlyRemovedSeats = permanentlyRemovedSeats.filter(item => item.seat !== seatNumber);
    }
    localStorage.setItem("removedSeats_" + hall, JSON.stringify(removedSeats));
    localStorage.setItem("permanentlyRemovedSeats_" + hall, JSON.stringify(permanentlyRemovedSeats));
    renderSeats();
  }).catch(() => {});
});
  
// MINUS button: Remove a seat.
document.getElementById('remove-seat-button').addEventListener('click', function () {
  verifyAdmin().then(() => {
    const seatInput = prompt("Enter the seat number you want to remove:");
    if (seatInput === null) return;
    const seatNumber = parseInt(seatInput, 10);
    if (isNaN(seatNumber) || seatNumber < 1 || seatNumber > totalSeats) {
      alert("Invalid seat number.");
      return;
    }
    if (soldSeats.includes(seatNumber)) {
      alert(`Seat ${seatNumber} is sold and cannot be removed.`);
      return;
    }
    if (isSeatRemoved(seatNumber, removedSeats) || isSeatRemoved(seatNumber, permanentlyRemovedSeats)) {
      alert(`Seat ${seatNumber} is already removed.`);
      return;
    }
    removedSeats.push({ seat: seatNumber, removalDate: new Date().toISOString() });
    localStorage.setItem("removedSeats_" + hall, JSON.stringify(removedSeats));
    renderSeats();
  }).catch(() => {});
});
  
// ------------------ Monthly Report Functionality ------------------

// When a month is selected, generate a report showing counts and a "View Full Details" option.
function showMonthlySeatReport(month) {
  console.log("Selected month:", month);
  fetch('https://hie-1.onrender.com/api/students')
    .then(response => response.json())
    .then(students => {
      const filteredStudents = students.filter(s => {
         const regMonth = getMonthFromDate(s.registration_date);
         console.log(`Student ${s.name} registered in:`, regMonth);
         return s.hall === hall && regMonth === month;
      });
      const soldSeatNumbers = filteredStudents.map(s => s.seat_number);
      const soldCount = soldSeatNumbers.length;
      
      const removedForMonth = removedSeats
        .filter(item => getMonthFromDate(item.removalDate) === month)
        .map(item => item.seat);
      const removedForMonthPermanent = permanentlyRemovedSeats
        .filter(item => getMonthFromDate(item.removalDate) === month)
        .map(item => item.seat);
      const removedSeatNumbers = [...removedForMonth, ...removedForMonthPermanent].sort((a, b) => a - b);
      const removedCount = removedSeatNumbers.length;
      
      const availableCount = totalSeats - (soldCount + removedSeatNumbers.length);
      
      const monthlyReportContainer = document.getElementById('monthly-report');
      monthlyReportContainer.innerHTML = `
        <h3>${month} Report</h3>
        <div class="stats">
          <div class="stat-item">
            <span class="stat-number">${soldCount}</span>
            <span class="stat-label">Occupied Seats</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${availableCount}</span>
            <span class="stat-label">Available Seats</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${removedCount}</span>
            <span class="stat-label">Removed Seats</span>
          </div>
        </div>
        <p>Total Seats: ${totalSeats}</p>
        <button class="btn" onclick="toggleFullReport('${month}')">View Full Details</button>
      `;
    })
    .catch(err => console.error("Error generating monthly report:", err));
}
  
// Toggle between the summary and detailed report views.
function toggleFullReport(month) {
  const monthlyReportContainer = document.getElementById('monthly-report');
  const currentHTML = monthlyReportContainer.innerHTML;
  
  if (currentHTML.includes("View Full Details")) {
    // Switch to detailed view
    fetch('https://hie-1.onrender.com/api/students')
      .then(response => response.json())
      .then(students => {
      const filteredStudents = students.filter(s => {
        const regMonth = getMonthFromDate(s.registration_date);
        return s.hall === hall && regMonth === month;
      });
      
        const soldSeatNumbers = filteredStudents.map(s => s.seat_number);
        const removedForMonth = removedSeats
          .filter(item => getMonthFromDate(item.removalDate) === month)
          .map(item => item.seat);
        const removedForMonthPermanent = permanentlyRemovedSeats
          .filter(item => getMonthFromDate(item.removalDate) === month)
          .map(item => item.seat);
        const removedSeatNumbers = [...removedForMonth, ...removedForMonthPermanent].sort((a, b) => a - b);
  
      let htmlContent = `<h3>${month} - Detailed Report</h3>`;
      
      if (filteredStudents.length > 0) {
        htmlContent += `<p><strong>Sold Seats (${filteredStudents.length}):</strong> ${soldSeatNumbers.join(', ')}</p>`;
        htmlContent += `<table class="report-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Seat No.</th>
              <th>Reg. Date</th>
            </tr>
          </thead>
          <tbody>`;
        
        filteredStudents.forEach(student => {
          htmlContent += `<tr>
            <td>${student.name} ${student.surname}</td>
            <td>${student.seat_number}</td>
            <td>${new Date(student.registration_date).toLocaleDateString()}</td>
          </tr>`;
        });
        
        htmlContent += `</tbody></table>`;
      } else {
        htmlContent += `<p>No seats were sold in ${month}.</p>`;
      }
      
      if (removedSeatNumbers.length > 0) {
        htmlContent += `<p><strong>Removed Seats (${removedSeatNumbers.length}):</strong> ${removedSeatNumbers.join(', ')}</p>`;
      } else {
        htmlContent += `<p>No seats were removed in ${month}.</p>`;
      }
      
      htmlContent += `<button class="btn" onclick="showMonthlySeatReport('${month}')">Back to Summary</button>`;
      
      monthlyReportContainer.innerHTML = htmlContent;
      })
    .catch(err => console.error("Error generating detailed report:", err));
  } else {
    // Switch to summary
    showMonthlySeatReport(month);
  }
}
  
// Handle Month Change Dropdown
function handleMonthChange() {
  const monthSelect = document.getElementById('month-select');
  const selectedMonth = monthSelect.value;
  
  if (selectedMonth) {
    showMonthlySeatReport(selectedMonth);
  } else {
    document.getElementById('monthly-report').innerHTML = '';
  }
}
  
// Initial load of hall data
window.onload = function() {
  loadHallData();
};
