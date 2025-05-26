// auto-cleanup.js

// This file contains logic to automatically clean up expired seats 
// after the 60-day period (30 days active + 30 days pending removal)

// Function to check for and clean up expired seats
function checkAndCleanupExpiredSeats() {
    console.log("Running expired seat cleanup check...");
    
    fetch('https://hie-1.onrender.com/api/students')
      .then(response => {
        if (!response.ok) throw new Error("Failed to fetch students.");
        return response.json();
      })
      .then(students => {
        const today = new Date();
        
        // Find students whose registrations expired more than 60 days ago
        // and who haven't been marked as deleted yet
        const expiredStudents = students.filter(student => {
          if (student.deleted) return false; // Skip already deleted students
          
          const regDate = new Date(student.registration_date);
          const daysSinceRegistration = daysBetween(today, regDate);
          
          // Student registration expired (more than 60 days old)
          return daysSinceRegistration > 60;
        });
        
        console.log(`Found ${expiredStudents.length} students with expired registrations.`);
        
        // Process each expired student
        expiredStudents.forEach(student => {
          console.log(`Processing expired student: ${student.name} (ID: ${student._id})`);
          
          // Mark student as deleted
          fetch(`https://hie-1.onrender.com/api/students/${student._id}`, { 
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            }
          })
            .then(response => {
              if (!response.ok) throw new Error("Failed to mark student as deleted.");
              return response.json();
            })
            .then(data => {
              console.log(`Successfully marked student ${student.name} as deleted.`);
              
              // Log the removal of the seat
              console.log(`Removed seat ${student.seat_number} in ${student.hall} for expired student ${student.name}`);
            })
            .catch(error => console.error(`Error marking student ${student._id} as deleted:`, error));
        });
      })
      .catch(error => console.error('Error in expired seat cleanup:', error));
  }
  
  // Calculate days between two dates
  function daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    const firstDate = new Date(date1);
    const secondDate = new Date(date2);
    return Math.round(Math.abs((firstDate - secondDate) / oneDay));
  }
  
  // Run cleanup check when the script is loaded
  checkAndCleanupExpiredSeats();
  
  // Set up automatic cleanup check every day
  // In a production environment, this would be better handled by a scheduled task/cron job
  // This is a client-side implementation for demonstration
  const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  setInterval(checkAndCleanupExpiredSeats, CLEANUP_INTERVAL);
  
  // Export for use in other files if needed
  export { checkAndCleanupExpiredSeats };