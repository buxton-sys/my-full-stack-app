import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || "MERCURE_SECRET_2025";

console.log("🔄 Server starting...");

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is required!");
  process.exit(1);
}
// Mongoose Models - Keeping same structure as SQL tables
const memberSchema = new mongoose.Schema({
  member_code: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  username: { type: String, unique: true, required: true },
  phone: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Member' },
  balance: { type: Number, default: 0 },
  total_savings: { type: Number, default: 0 },
  debts: { type: Number, default: 0 },
  afterschool: { type: Number, default: 0 },
  loans: { type: Number, default: 0 },
  fines: { type: Number, default: 0 },
  status: { type: String, default: 'approved' },
  last_active: { type: Date, default: Date.now }
});

const savingsSchema = new mongoose.Schema({
  member_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  member_code: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const loansSchema = new mongoose.Schema({
  member_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  member_code: { type: String, required: true },
  amount: { type: Number, required: true },
  purpose: String,
  reason: String,
  status: { type: String, default: 'pending' },
  due_date: Date,
  created_at: { type: Date, default: Date.now }
});

const finesSchema = new mongoose.Schema({
  member_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  member_code: { type: String, required: true },
  amount: { type: Number, required: true },
  reason: String,
  date: { type: Date, default: Date.now },
  paid: { type: Boolean, default: false }
});

const announcementsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const pendingTransactionsSchema = new mongoose.Schema({
  member_code: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, required: true },
  status: { type: String, default: 'pending' },
  proof_image: String,
  rejection_reason: String,
  created_at: { type: Date, default: Date.now }
});

const Member = mongoose.model('Member', memberSchema);
const Savings = mongoose.model('Savings', savingsSchema);
const Loans = mongoose.model('Loans', loansSchema);
const Fines = mongoose.model('Fines', finesSchema);
const Announcement = mongoose.model('Announcement', announcementsSchema);
const PendingTransaction = mongoose.model('PendingTransaction', pendingTransactionsSchema);

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected - Data will NEVER disappear!');
    
    // Initialize with real members data
    await initializeRealMembers();
    await createRealLoansAndFines();
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });

// Initialize real members data
async function initializeRealMembers() {
  try {
    const realMembers = [
      {
        member_code: "001", name: "Hemston Odege", role: "Chairperson",
        balance: 2180, total_savings: 2180, debts: 0, afterschool: 550, loans: 0, fines: 0,
        email: "hemstonodege@gmail.com", username: "morningstar", password: "pass001", phone: "0708692752"
      },
      {
        member_code: "002", name: "James Blessing", role: "Deputy Chairperson", 
        balance: 120, total_savings: 120, debts: 600, afterschool: 250, loans: 0, fines: 0,
        email: "jamesblessings22122@gmail.com", username: "jay bless", password: "James2005", phone: "0759461630"
      },
      {
        member_code: "003", name: "Peter Omondi", role: "Secretary",
        balance: 2100, total_savings: 2100, debts: 400, afterschool: 400, loans: 0, fines: 0,
        email: "peteromondi@gmail.com", username: "sketcher7", password: "pass003", phone: "0727906729"
      },
      {
        member_code: "004", name: "Kevin Buxton", role: "Treasurer",
        balance: 1890, total_savings: 1890, debts: 240, afterschool: 400, loans: 0, fines: 0,
        email: "kevinbuxton2005@gmail.com", username: "delaquez", password: "@Delaquez6", phone: "0112009871"
      },
      {
        member_code: "005", name: "Phelix Odhiambo", role: "Organizer",
        balance: 2850, total_savings: 2850, debts: 0, afterschool: 250, loans: 0, fines: 0,
        email: "phelixodhiambo@gmail.com", username: "phelix", password: "pass005", phone: "0740499128"
      },
      {
        member_code: "006", name: "Meshack Odhiambo", role: "Head of Security",
        balance: 3600, total_savings: 3600, debts: 440, afterschool: 450, loans: 0, fines: 0,
        email: "okothmeshack15@gmail.com", username: "meshack", password: "pass006", phone: "0739669233"
      },
      {
        member_code: "007", name: "Ashley Isca", role: "Editor", 
        balance: 2240, total_savings: 2240, debts: 0, afterschool: 450, loans: 2000, fines: 0,
        email: "berylbaraza38@gmail.com", username: "isca", password: "1234..tems", phone: "0740136631"
      },
      {
        member_code: "008", name: "Bayden Phelix", role: "Member",
        balance: 600, total_savings: 600, debts: 660, afterschool: 150, loans: 0, fines: 100,
        email: "baydenphelix@gmail.com", username: "bayden", password: "pass008", phone: "0796437516"
      },
      {
        member_code: "009", name: "Jacob Onyango", role: "Member",
        balance: 270, total_savings: 270, debts: 810, afterschool: 0, loans: 0, fines: 100,
        email: "jacobonyango@gmail.com", username: "jacob", password: "pass009", phone: "0112978002"
      },
      {
        member_code: "010", name: "Martin Okello", role: "Member",
        balance: 0, total_savings: 0, debts: 650, afterschool: 0, loans: 0, fines: 0,
        email: "martin@gmail.com", username: "martin", password: "pass010", phone: "0701302727"
      },
      {
        member_code: "011", name: "Lenox Javan", role: "Member",
        balance: 0, total_savings: 0, debts: 500, afterschool: 100, loans: 0, fines: 100,
        email: "lenox@gmail.com", username: "lenox", password: "pass011", phone: "0757341511"
      }
    ];

    for (const memberData of realMembers) {
      const existingMember = await Member.findOne({ member_code: memberData.member_code });
      if (!existingMember) {
        const hashedPassword = await bcrypt.hash(memberData.password, 10);
        await Member.create({
          ...memberData,
          password: hashedPassword
        });
        console.log(`✅ Added member: ${memberData.name} (${memberData.member_code})`);
      }
    }
  } catch (error) {
    console.error('Error initializing members:', error);
  }
}

// Create real loans and fines
async function createRealLoansAndFines() {
  try {
    console.log("🔄 Creating real loans and fines records...");
    
    const realLoans = [
      { member_code: "007", amount: 2000, purpose: "Personal Loan", reason: "Emergency funding", due_date: new Date("2024-12-31"), status: "approved" }
    ];

    const realFines = [
      { member_code: "008", amount: 100, reason: "Late payment penalty" },
      { member_code: "009", amount: 100, reason: "Meeting absence fine" },
      { member_code: "011", amount: 100, reason: "Late submission fine" }
    ];

    for (const loanData of realLoans) {
      const member = await Member.findOne({ member_code: loanData.member_code });
      if (member) {
        const existingLoan = await Loans.findOne({ 
          member_code: loanData.member_code, 
          amount: loanData.amount 
        });
        if (!existingLoan) {
          await Loans.create({
            member_id: member._id,
            ...loanData
          });
          console.log(`✅ Created REAL loan record for ${loanData.member_code}: $${loanData.amount}`);
        }
      }
    }

    for (const fineData of realFines) {
      const member = await Member.findOne({ member_code: fineData.member_code });
      if (member) {
        const existingFine = await Fines.findOne({ 
          member_code: fineData.member_code, 
          amount: fineData.amount 
        });
        if (!existingFine) {
          await Fines.create({
            member_id: member._id,
            ...fineData
          });
          console.log(`✅ Created REAL fine record for ${fineData.member_code}: $${fineData.amount}`);
        }
      }
    }
  } catch (error) {
    console.error('Error creating loans and fines:', error);
  }
}

// Add this route to debug MongoDB connection
app.get("/api/debug/mongodb", async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    res.json({ 
      mongodb_connected: isConnected,
      readyState: mongoose.connection.readyState,
      connection_string: process.env.MONGODB_URI ? "Set" : "Not set"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);
  next();
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: "Access token required" });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// ====================== ESSENTIAL ROUTES ======================

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

app.get("/api/test", (req, res) => {
  res.json({ message: "✅ API is working!" });
});

// Login with username
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log("📍 Login attempt for username:", username);

    const member = await Member.findOne({ username });
    
    if (!member) {
      console.log("❌ User not found:", username);
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    const match = await bcrypt.compare(password, member.password);
    
    if (!match) {
      console.log("❌ Invalid password for:", username);
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    const token = jwt.sign(
      { 
        id: member._id, 
        username: member.username, 
        role: member.role,
        member_code: member.member_code 
      },
      SECRET_KEY,
      { expiresIn: "7d" }
    );

    console.log("✅ Login successful for:", username);
    
    res.json({
      success: true,
      message: "Login successful",
      token: token,
      role: member.role,
      user: {
        id: member._id,
        name: member.name,
        username: member.username,
        role: member.role,
        member_code: member.member_code
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error during login" });
  }
});

// Add this route to debug the login issue
app.get("/api/debug-login", async (req, res) => {
  try {
    console.log("🔍 Debugging login setup...");
    
    // Check if members exist
    const members = await Member.find().limit(3);
    console.log("Found members:", members.length);
    
    // Check if test user exists
    const testUser = await Member.findOne({ username: "delaquez" });
    
    res.json({
      database_connected: mongoose.connection.readyState === 1,
      total_members: await Member.countDocuments(),
      test_user_exists: !!testUser,
      test_user: testUser ? {
        username: testUser.username,
        hasPassword: !!testUser.password
      } : null,
      sample_members: members.map(m => ({
        username: m.username,
        name: m.name
      }))
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Register new member
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, username, password, phone } = req.body;
    
    if (!name || !email || !username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: "All fields are required" 
      });
    }

    // Check if user already exists
    const existingUser = await Member.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: "User already exists with this email or username" 
      });
    }

    // Generate member code (you might want a better system)
    const memberCount = await Member.countDocuments();
    const member_code = String(memberCount + 1).padStart(3, '0');

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newMember = await Member.create({
      member_code,
      name,
      email,
      username,
      password: hashedPassword,
      phone,
      role: 'Member',
      balance: 0,
      total_savings: 0,
      debts: 0,
      afterschool: 0,
      loans: 0,
      fines: 0
    });

    res.json({ 
      success: true, 
      message: "Registration successful!",
      member_code: newMember.member_code
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Registration failed" 
    });
  }
});

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// REAL Forgot Password with Email
app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log("📍 Password reset request for email:", email);

    const member = await Member.findOne({ email });
    
    if (!member) {
      return res.status(404).json({ success: false, message: "Email not found in our system" });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Mercure Group - Password Reminder',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Mercure Group Password Reminder</h2>
          <p>Hello ${member.name},</p>
          <p>You requested a password reminder for your account.</p>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Your login details:</strong></p>
            <p style="margin: 5px 0;"><strong>Username:</strong> ${member.username}</p>
            <p style="margin: 5px 0;"><strong>Password:</strong> Use your registered password</p>
          </div>
          <p><strong>Login at:</strong> https://mercure-group-system.surge.sh</p>
          <hr style="margin: 30px 0;">
          <p style="color: #6B7280; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reminder email sent to ${email}`);
    
    res.json({ 
      success: true, 
      message: "Password reminder sent to your email" 
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ success: false, message: "Error sending password reminder email" });
  }
});

// Members sorted by role hierarchy
app.get("/api/members", async (req, res) => {
  try {
    const roleOrder = {
      'Chairperson': 1,
      'Deputy Chairperson': 2,
      'Secretary': 3,
      'Treasurer': 4,
      'Organizer': 5,
      'Head of Security': 6,
      'Editor': 7,
      'Member': 8
    };

    const members = await Member.find({}, {
      password: 0 // Exclude password field
    });

    // Sort by custom role order
    const sortedMembers = members.sort((a, b) => {
      const orderA = roleOrder[a.role] || 8;
      const orderB = roleOrder[b.role] || 8;
      return orderA - orderB || a.name.localeCompare(b.name);
    });

    res.json(sortedMembers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/members/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: "Name and email are required" });
    }

    await Member.findByIdAndUpdate(id, {
      name, email, phone, role
    });

    res.json({ success: true, message: "Member updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete Member route
app.delete("/api/members/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await Member.findByIdAndDelete(id);
    res.json({ success: true, message: "Member deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ====================== UPDATED SAVINGS ROUTES (USE MEMBER_CODE) ======================

app.get("/api/get-savings", authenticateToken, async (req, res) => {
  try {
    const savings = await Savings.find().sort({ date: -1 });
    res.json(savings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// FIXED: Add savings route with proper closure
app.post("/api/add-saving", authenticateToken, async (req, res) => {
  try {
    const { member_code, amount } = req.body;
    if (!member_code || !amount) {
      return res.status(400).json({ success: false, error: "Member code and amount required" });
    }

    const member = await Member.findOne({ member_code });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Create savings record
    const saving = await Savings.create({
      member_id: member._id,
      member_code,
      amount
    });

    // Update member balance
    await Member.findByIdAndUpdate(member._id, {
      $inc: { 
        balance: amount, 
        total_savings: amount 
      }
    });

    res.json({ 
      success: true, 
      message: "Savings added and balance updated!", 
      savingsId: saving._id 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Afterschool routes
app.get("/api/afterschool", async (req, res) => {
  try {
    const members = await Member.find({ afterschool: { $gt: 0 } });
    res.json(members || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/afterschool/total", async (req, res) => {
  try {
    const result = await Member.aggregate([
      { $group: { _id: null, total: { $sum: "$afterschool" } } }
    ]);
    res.json({ total: result[0]?.total || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====================== UPDATED FINES ROUTES ======================

app.get("/api/get-fines", authenticateToken, async (req, res) => {
  try {
    const fines = await Fines.find().sort({ date: -1 });
    res.json(fines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/add-fine", authenticateToken, async (req, res) => {
  try {
    const { member_code, amount, reason } = req.body;
    if (!member_code || !amount) {
      return res.status(400).json({ success: false, error: "Member code and amount required" });
    }

    const member = await Member.findOne({ member_code });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const fine = await Fines.create({
      member_id: member._id,
      member_code,
      amount,
      reason
    });

    // Update member's fines total
    await Member.findByIdAndUpdate(member._id, {
      $inc: { fines: amount }
    });

    res.json({ success: true, message: "Fine added!", id: fine._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add this route to your backend
app.post("/api/pay-fine-pending", authenticateToken, async (req, res) => {
  try {
    const { member_code, fine_id, amount } = req.body;
    
    if (!member_code || !fine_id || !amount) {
      return res.status(400).json({ success: false, error: "Member code, fine ID and amount required" });
    }

    // Add to pending transactions for admin approval
    const transaction = await PendingTransaction.create({
      member_code,
      amount,
      type: 'fine_payment',
      proof_image: fine_id
    });

    res.json({ 
      success: true, 
      message: "Fine payment submitted for admin approval",
      id: transaction._id 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====================== REAL DATA ROUTES ======================

// Get savings with member names - REAL DATA
app.get("/api/savings-with-members", async (req, res) => {
  try {
    const savings = await Savings.find()
      .populate('member_id', 'name member_code')
      .sort({ date: -1 });
    res.json(savings || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get loans with member names - REAL DATA  
app.get("/api/loans-with-members", async (req, res) => {
  try {
    const loans = await Loans.find()
      .populate('member_id', 'name member_code')
      .sort({ due_date: -1 });
    res.json(loans || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get fines with member names - REAL DATA
app.get("/api/fines-with-members", async (req, res) => {
  try {
    const fines = await Fines.find()
      .populate('member_id', 'name member_code')
      .sort({ date: -1 });
    res.json(fines || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate group progress - REAL CALCULATION
app.get("/api/group-progress", async (req, res) => {
  try {
    const totalSavings = await Member.aggregate([
      { $group: { _id: null, current_total: { $sum: "$total_savings" } } }
    ]);

    const totalMembers = await Member.countDocuments();
    
    const currentTotal = totalSavings[0]?.current_total || 0;
    const dailyTarget = 30;
    const yearlyTarget = dailyTarget * 365 * totalMembers;
    const progress = (currentTotal / yearlyTarget) * 100;
    
    res.json({
      current_total: currentTotal,
      daily_target: dailyTarget,
      yearly_target: yearlyTarget,
      progress_percentage: progress.toFixed(2),
      total_members: totalMembers,
      message: `Progress: ${progress.toFixed(2)}% of yearly target`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get members for dropdowns - REAL MEMBERS
app.get("/api/members-dropdown", async (req, res) => {
  try {
    const members = await Member.find({}, 'member_code name').sort({ name: 1 });
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====================== UPDATED LOANS ROUTES ======================

app.get("/api/get-loans", authenticateToken, async (req, res) => {
  try {
    const loans = await Loans.find();
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/request-loan", authenticateToken, async (req, res) => {
  try {
    const { member_code, amount, purpose, reason, due_date } = req.body;
    if (!member_code || !amount) {
      return res.status(400).json({ success: false, error: "Member code and amount required" });
    }

    const member = await Member.findOne({ member_code });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const loan = await Loans.create({
      member_id: member._id,
      member_code,
      amount,
      purpose,
      reason,
      due_date
    });

    res.json({ success: true, message: "Loan requested!", id: loan._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====================== ANNOUNCEMENTS ROUTES ======================

app.get("/api/announcements", async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ created_at: -1 });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/announcements", authenticateToken, async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, error: "Title and message required" });
    }

    const announcement = await Announcement.create({ title, message });
    res.json({ success: true, message: "Announcement added!", id: announcement._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/announcements/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await Announcement.findByIdAndDelete(id);
    res.json({ success: true, message: "Announcement deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ====================== DASHBOARD & STATS ROUTES ======================

app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
  try {
    const total_members = await Member.countDocuments();
    const total_savings_result = await Savings.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const total_loans = await Loans.countDocuments({ status: 'pending' });
    const pending_transactions = await PendingTransaction.countDocuments({ status: 'pending' });

    res.json({
      total_members,
      total_savings: total_savings_result[0]?.total || 0,
      pending_loans: total_loans,
      pending_approvals: pending_transactions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====================== ADD THESE MISSING ROUTES ======================

// PROPER Leaderboard - Sorted by rank/balance
app.get("/api/leaderboard/top-savers", async (req, res) => {
  try {
    const topSavers = await Member.find({ balance: { $gt: 0 } })
      .select('member_code name role balance total_savings debts afterschool')
      .sort({ balance: -1 })
      .limit(10);
    res.json(topSavers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Total savings route - FIXED
app.get("/api/get-total-savings", async (req, res) => {
  try {
    const result = await Savings.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    res.json({ total: result[0]?.total || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Group stats route - FIXED
app.get("/api/group-stats", async (req, res) => {
  try {
    const total_members = await Member.countDocuments();
    const total_savings_result = await Savings.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const active_loans = await Loans.countDocuments({ status: 'approved' });

    res.json({
      total_members,
      total_savings: total_savings_result[0]?.total || 0,
      active_loans
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Financial summary - FIXED
app.get("/api/financial/summary", async (req, res) => {
  try {
    const total_savings_result = await Savings.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const total_loans_result = await Loans.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const total_fines_result = await Fines.aggregate([
      { $match: { paid: false } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    res.json({
      total_savings: total_savings_result[0]?.total || 0,
      total_loans: total_loans_result[0]?.total || 0,
      total_fines: total_fines_result[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====================== APPROVAL SYSTEM ROUTES (FIXED) ======================

// Get user-specific data - PROTECTED
app.get("/api/user/:member_code/data", authenticateToken, async (req, res) => {
  try {
    const { member_code } = req.params;
    
    // Check if user is authorized to access this data
    if (req.user.role !== 'admin' && req.user.member_code !== member_code) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const member = await Member.findOne({ member_code });
    if (!member) return res.status(404).json({ error: "Member not found" });
    
    const savings = await Savings.find({ member_code }).sort({ date: -1 });
    const loans = await Loans.find({ member_code });
    const fines = await Fines.find({ member_code });
    
    res.json({
      member: {
        id: member._id,
        member_code: member.member_code,
        name: member.name,
        role: member.role,
        balance: member.balance,
        total_savings: member.total_savings,
        debts: member.debts,
        afterschool: member.afterschool,
        loans: member.loans,
        fines: member.fines
      },
      savings: savings || [],
      loans: loans || [],
      fines: fines || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pending transactions system - PROTECTED
app.post("/api/pending-transactions", authenticateToken, async (req, res) => {
  try {
    const { member_code, amount, type, proof_image } = req.body;
    
    const member = await Member.findOne({ member_code });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }
    
    const transaction = await PendingTransaction.create({
      member_code,
      amount,
      type,
      proof_image
    });

    console.log(`📧 Admin notified: New ${type} from member ${member_code}`);
    
    res.json({ 
      success: true, 
      message: "Transaction submitted for approval",
      id: transaction._id 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending transactions (for admin only) - PROTECTED
app.get("/api/pending-transactions", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    const transactions = await PendingTransaction.find({ status: 'pending' })
      .populate('member_id', 'name')
      .sort({ created_at: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// FIXED: Approve pending transaction (admin only) - PROTECTED
app.put("/api/pending-transactions/:id/approve", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    const transaction = await PendingTransaction.findById(id);
    
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const member = await Member.findOne({ member_code: transaction.member_code });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Process based on transaction type
    if (transaction.type === 'savings') {
      // Add to savings and update balance
      await Savings.create({
        member_id: member._id,
        member_code: transaction.member_code,
        amount: transaction.amount
      });
      
      await Member.findByIdAndUpdate(member._id, {
        $inc: { balance: transaction.amount, total_savings: transaction.amount }
      });
    }
    else if (transaction.type === 'loan_repayment') {
      // Process loan repayment
      await Loans.findByIdAndUpdate(transaction.proof_image, {
        $inc: { amount: -transaction.amount }
      });
    }
    else if (transaction.type === 'fine_payment') {
      // Process fine payment
      await Fines.findByIdAndUpdate(transaction.proof_image, {
        paid: true
      });
    }
    else if (transaction.type === 'loan_request') {
      // Process loan request - create actual loan record
      const loanData = JSON.parse(transaction.proof_image || '{}');
      await Loans.create({
        member_id: member._id,
        member_code: transaction.member_code,
        amount: transaction.amount,
        purpose: loanData.purpose,
        reason: loanData.reason,
        due_date: loanData.due_date,
        status: 'approved'
      });
    }

    // Mark transaction as approved
    await PendingTransaction.findByIdAndUpdate(id, { status: 'approved' });
    
    res.json({ success: true, message: "Transaction approved successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject pending transaction (admin only) - PROTECTED
app.put("/api/pending-transactions/:id/reject", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    const { reason } = req.body;
    
    await PendingTransaction.findByIdAndUpdate(id, { 
      status: 'rejected', 
      rejection_reason: reason 
    });

    console.log(`📧 Member notified: Your transaction was rejected - ${reason}`);
    
    res.json({ success: true, message: "Transaction rejected" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====================== FUNCTIONAL BUTTON ROUTES ======================

// Add Fine - WORKS WHEN ADMIN PRESSES
app.post("/api/add-fine", authenticateToken, async (req, res) => {
  try {
    const { member_code, amount, reason } = req.body;
    
    if (!member_code || !amount || !reason) {
      return res.status(400).json({ success: false, error: "Member code, amount and reason required" });
    }

    const member = await Member.findOne({ member_code });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const fine = await Fines.create({
      member_id: member._id,
      member_code,
      amount,
      reason
    });

    // Update member's fines total
    await Member.findByIdAndUpdate(member._id, {
      $inc: { fines: amount }
    });

    res.json({ 
      success: true, 
      message: `Fine of Ksh ${amount} added to ${member_code} for: ${reason}`,
      id: fine._id 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve Loan - WORKS WHEN ADMIN PRESSES
app.put("/api/loans/:id/approve", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await Loans.findByIdAndUpdate(id, { status: 'approved' });

    res.json({ 
      success: true, 
      message: "Loan approved successfully!" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject Loan - WORKS WHEN ADMIN PRESSES
app.put("/api/loans/:id/reject", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    await Loans.findByIdAndUpdate(id, { 
      status: 'rejected', 
      reason: reason || "No reason provided" 
    });

    res.json({ 
      success: true, 
      message: "Loan rejected successfully!" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark Fine as Paid - WORKS WHEN ADMIN PRESSES
app.put("/api/fines/:id/pay", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await Fines.findByIdAndUpdate(id, { paid: true });

    res.json({ 
      success: true, 
      message: "Fine marked as paid!" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Record - WORKS WHEN ADMIN PRESSES
app.delete("/api/:type/:id", authenticateToken, async (req, res) => {
  try {
    const { type, id } = req.params;
    
    let Model;
    if (type === 'savings') Model = Savings;
    else if (type === 'loans') Model = Loans;
    else if (type === 'fines') Model = Fines;
    else return res.status(400).json({ error: "Invalid type" });

    await Model.findByIdAndDelete(id);

    res.json({ 
      success: true, 
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} record deleted successfully!` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request loan (for members) - submits for approval
app.post("/api/request-loan-pending", authenticateToken, async (req, res) => {
  try {
    const { member_code, amount, purpose, reason, due_date } = req.body;
    
    if (!member_code || !amount || !purpose) {
      return res.status(400).json({ success: false, error: "Member code, amount and purpose required" });
    }

    // Add to pending transactions for admin approval
    const transaction = await PendingTransaction.create({
      member_code,
      amount,
      type: 'loan_request',
      proof_image: JSON.stringify({ purpose, reason, due_date })
    });

    res.json({ 
      success: true, 
      message: "Loan request submitted for admin approval",
      id: transaction._id 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pay fine (for members) - submits for approval
app.post("/api/pay-fine-pending", authenticateToken, async (req, res) => {
  try {
    const { member_code, fine_id, amount } = req.body;
    
    if (!member_code || !fine_id || !amount) {
      return res.status(400).json({ success: false, error: "Member code, fine ID and amount required" });
    }

    // Add to pending transactions for admin approval
    const transaction = await PendingTransaction.create({
      member_code,
      amount,
      type: 'fine_payment',
      proof_image: fine_id
    });

    res.json({ 
      success: true, 
      message: "Fine payment submitted for admin approval",
      id: transaction._id 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add this route to your backend
app.post("/api/repay-loan-pending", authenticateToken, async (req, res) => {
  try {
    const { member_code, loan_id, amount } = req.body;
    
    if (!member_code || !loan_id || !amount) {
      return res.status(400).json({ success: false, error: "Member code, loan ID and amount required" });
    }

    // Add to pending transactions for admin approval
    const transaction = await PendingTransaction.create({
      member_code,
      amount,
      type: 'loan_repayment',
      proof_image: loan_id
    });

    res.json({ 
      success: true, 
      message: "Loan repayment submitted for admin approval",
      id: transaction._id 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====================== REAL WORKING ROUTES ======================

// REAL Automation status - using actual data
app.get("/api/automation/status", async (req, res) => {
  try {
    const total_members = await Member.countDocuments();
    const pending_loans = await Loans.countDocuments({ status: 'pending' });

    res.json({
      success: true,
      status: "active", 
      total_members,
      pending_loans,
      lastDailyRun: new Date().toISOString(),
      message: "System operational"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// REAL Automation activities - from actual database
app.get("/api/automation/activities", async (req, res) => {
  try {
    const savingsActivities = await Savings.aggregate([
      {
        $match: {
          date: { $gte: new Date(new Date().setHours(0,0,0,0)) }
        }
      },
      {
        $project: {
          type: 'savings',
          description: 'Daily savings recorded',
          member_code: 1,
          amount: 1,
          timestamp: '$date'
        }
      }
    ]);

    const loanActivities = await Loans.aggregate([
      {
        $match: {
          due_date: { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) }
        }
      },
      {
        $project: {
          type: 'loan',
          description: { $concat: ['Loan ', '$status'] },
          member_code: 1,
          amount: 1,
          timestamp: '$due_date'
        }
      }
    ]);

    const activities = [...savingsActivities, ...loanActivities]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    res.json(activities);
  } catch (error) {
    console.error("Activities error:", error);
    res.json([]);
  }
});

// REAL Pending transactions - FIXED
app.get("/api/pending-transactions", authenticateToken, async (req, res) => {
  try {
    const transactions = await PendingTransaction.find({ status: 'pending' })
      .populate('member_id', 'name')
      .sort({ created_at: -1 });
    res.json(transactions || []);
  } catch (error) {
    console.error("Pending transactions error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ADD THIS TO YOUR server.js - It shows what's REALLY in the database
app.get("/api/real-data", async (req, res) => {
  try {
    const savings = await Savings.find();
    const fines = await Fines.find();

    res.json({
      savings: savings || [],
      fines: fines || [],
      message: `Found ${savings?.length || 0} savings and ${fines?.length || 0} fines in database`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADD TO server.js - Check ALL data
app.get("/api/debug-all", async (req, res) => {
  try {
    const members = await Member.find();
    const savings = await Savings.find();
    const fines = await Fines.find();
    const loans = await Loans.find();

    res.json({
      members: members?.length || 0,
      savings: savings?.length || 0,
      fines: fines?.length || 0, 
      loans: loans?.length || 0,
      message: "Total records in database"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static files from React build (if you have a build folder)
app.use(express.static(path.join(__dirname, 'build')));

// Catch-all handler: send back React's index.html for any unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// ====================== SERVER START ======================
app.get("/", (req, res) => res.send("Mercure API running with MongoDB!"));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}/api`);
  console.log(`✅ Health: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Login: kevinbuxton2005@gmail.com / @Delaquez6`);
  console.log(`📊 New Features: Approval System, Member Codes, Enhanced Security`);
  console.log(`🗄️  Database: MongoDB - All data preserved!`);
});



