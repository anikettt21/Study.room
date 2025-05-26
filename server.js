const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "study-room-secret-key";

// MongoDB Connection
const uri = "mongodb+srv://aniketgade:878819@cluster9.0jf9h.mongodb.net/studyroomfinal?retryWrites=true&w=majority";

mongoose.connect(uri, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true
})
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => console.error("MongoDB connection error:", err));

//
// Mongoose Schemas and Models
//

// Student Schema
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  surname: { type: String, required: true },
  email: String,
  phone: { type: String, required: true },
  hall: { type: String, required: true },
  seat_number: { type: Number, required: true },
  seat_type: String,
  payment_method: String,
  remaining_fees: String,
  fees_amount: Number,
  registration_date: { type: Date, required: true },
  deleted: { type: Boolean, default: false }
});
const Student = mongoose.model("Student", studentSchema);

// Admin Schema
const adminSchema = new mongoose.Schema({
  password_hash: String,
  phone: String
});
const Admin = mongoose.model("Admin", adminSchema);

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  phone: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true }
});
const User = mongoose.model("User", userSchema);

//
// Middleware
//

// JWT Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: "Access denied. No token provided." 
    });
  }
  
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(403).json({ 
      success: false, 
      message: "Invalid or expired token" 
    });
  }
}

//
// Admin Routes
//

// GET: Check if an admin password is set
app.get('/api/admin/check', async (req, res) => {
  try {
    const admin = await Admin.findOne();
    if (!admin || !admin.password_hash) {
      res.json({ passwordSet: false });
    } else {
      res.json({ passwordSet: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Set or update admin password
app.post('/api/admin/set-password', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password is required" });
  try {
    const hashed = await bcrypt.hash(password, 10);
    let admin = await Admin.findOne();
    if (!admin) {
      admin = new Admin({ password_hash: hashed });
    } else {
      admin.password_hash = hashed;
    }
    await admin.save();
    res.json({ message: "Admin password set/updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Verify admin login
app.post('/api/admin/login', async (req, res) => {
  const { password } = req.body;
  try {
    const admin = await Admin.findOne();
    if (!admin || !admin.password_hash)
      return res.status(400).json({ error: "No admin password set" });
    const match = await bcrypt.compare(password, admin.password_hash);
    if (match) {
      // Return a success object similar to user login
      res.json({ 
        success: true,
        message: "Admin login successful"
      });
    } else {
      res.status(401).json({ error: "Incorrect password" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Retrieve admin profile
app.get('/api/admin/profile', async (req, res) => {
  try {
    const admin = await Admin.findOne();
    if (!admin) {
      return res.json({ phone: "" });
    }
    res.json({ phone: admin.phone || "" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Save admin profile (password and/or phone)
app.post('/api/admin/save-profile', async (req, res) => {
  const { password, phone } = req.body;
  
  try {
    let admin = await Admin.findOne();
    if (!admin) {
      admin = new Admin({ phone: phone });
    } else {
      admin.phone = phone;
    }
    
    // If password is provided, hash and save it
    if (password) {
      // Validate password
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      
      const hasLetters = /[a-zA-Z]/.test(password);
      const hasNumbers = /[0-9]/.test(password);
      
      if (!hasLetters || !hasNumbers) {
        return res.status(400).json({ 
          error: "Password must contain both letters and numbers" 
        });
      }
      
      const hashed = await bcrypt.hash(password, 10);
      admin.password_hash = hashed;
    }
    
    await admin.save();
    res.json({ message: "Admin profile updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//
// Student Routes
//

// GET: Retrieve all students
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Retrieve a single student by ID
app.get('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Create a new student registration
app.post('/api/students', async (req, res) => {
  try {
    const studentData = req.body;
    studentData.registration_date = new Date(studentData.registration_date);
    const student = new Student(studentData);
    await student.save();
    res.json({ message: "Student registered successfully", student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT: Update a student registration
app.put('/api/students/:id', async (req, res) => {
  try {
    const studentData = req.body;
    studentData.registration_date = new Date(studentData.registration_date);
    const student = await Student.findByIdAndUpdate(req.params.id, studentData, { new: true });
    res.json({ message: "Student updated successfully", student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Soft delete a student (mark as deleted)
app.delete('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, { deleted: true }, { new: true });
    res.json({ message: "Student marked as deleted", student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Permanently delete a student by ID
app.delete('/api/students/permanent/:id', async (req, res) => {
  console.log("Permanent delete requested for student id:", req.params.id);
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      console.error("Student not found with id:", req.params.id);
      return res.status(404).json({ error: "Student not found" });
    }
    console.log("Student permanently deleted:", student);
    res.json({ message: "Student permanently deleted", student });
  } catch (err) {
    console.error("Error permanently deleting student:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT: Restore a deleted student
app.put('/api/students/restore/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { seat_number, registration_date } = req.body;
    
    // Find the student to restore
    const student = await Student.findById(id);
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Check if seat is already taken by another student
    if (seat_number) {
      const seatExists = await Student.findOne({ 
        hall: student.hall, 
        seat_number: seat_number,
        _id: { $ne: id }, // Exclude the current student
        deleted: false // Only check non-deleted students
      });
      
      if (seatExists) {
        return res.status(400).json({ 
          error: 'Seat is already taken', 
          message: `Seat ${seat_number} in ${student.hall} is already occupied.`
        });
      }
      
      // Update seat number if a new one is provided
      student.seat_number = seat_number;
    }
    
    // Update registration date if provided
    if (registration_date) {
      student.registration_date = new Date(registration_date);
    }
    
    // Mark student as not deleted
    student.deleted = false;
    
    // Save the updated student
    await student.save();
    
    res.json({ 
      message: 'Student has been restored successfully',
      student
    });
  } catch (error) {
    console.error('Error restoring student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//
// Hall Routes
//

// GET: Retrieve sold seat numbers for a given hall (non-deleted students)
app.get('/api/hall/:hall', async (req, res) => {
  try {
    const hallName = req.params.hall;
    const students = await Student.find({ hall: hallName, deleted: false });
    const seats = students.map(s => s.seat_number);
    res.json(seats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//
// Authentication Routes
//

// User Registration Route
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, phone, password, isAdminCreated } = req.body;
    
    // Validate input
    if (!phone || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Phone and password are required" 
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "User with this phone number already exists" 
      });
    }
    
    // Validate password
    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must be at least 8 characters" 
      });
    }
    
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    
    if (!hasLetters || !hasNumbers) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must contain both letters and numbers" 
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = new User({
      name,
      phone,
      password_hash: hashedPassword
    });
    
    await newUser.save();
    
    // If this is not an admin-created user, generate and return a token
    if (!isAdminCreated) {
      const token = jwt.sign(
        { userId: newUser._id, phone: newUser.phone },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        token,
        name: newUser.name
      });
    }
    
    // For admin-created users, just return success
    res.status(201).json({
      success: true,
      message: "User added successfully"
    });
    
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during registration" 
    });
  }
});

// User Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    // Validate input
    if (!phone || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Phone and password are required" 
      });
    }
    
    // Find user
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: "Login successful",
      token,
      name: user.name
    });
    
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during login" 
    });
  }
});

//
// User Routes
//

// GET: Protected user profile route
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password_hash');
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// GET: Retrieve all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('name phone _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE: Delete a user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const deletedUser = await User.findByIdAndDelete(userId);
    
    if (!deletedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// Add this route to your backend server file (e.g. server.js or app.js)

// Password verification endpoint
app.post('/api/auth/verify-password', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }
    
    // First check if it matches the admin password
    const adminQuery = await db.collection('admins').findOne({});
    if (adminQuery && adminQuery.password) {
      // Compare the provided password with the admin password
      const isAdminPassword = await bcrypt.compare(password, adminQuery.password);
      
      if (isAdminPassword) {
        return res.json({ success: true, message: 'Admin password verified' });
      }
    }
    
    // If not admin password, check if it's a valid user password
    // This assumes users have a phone number and password stored in the database
    const users = await db.collection('users').find().toArray();
    
    // Check each user's password
    for (const user of users) {
      if (user.password) {
        const isUserPassword = await bcrypt.compare(password, user.password);
        
        if (isUserPassword) {
          return res.json({ success: true, message: 'User password verified' });
        }
      }
    }
    
    // If we get here, no matching password was found
    return res.status(401).json({ success: false, message: 'Invalid password' });
    
  } catch (error) {
    console.error('Password verification error:', error);
    res.status(500).json({ success: false, message: 'Server error during password verification' });
  }
});
