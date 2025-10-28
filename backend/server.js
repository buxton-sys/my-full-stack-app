import express from "express";
import sqlite3 from "sqlite3";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

// Import routes and models
import authRoutes from "./routes/authRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import announcementRoutes from "./routes/announcementsRoutes.js";
import Member from "./models/memberRoutes.js";
import AutomationEngine from "./automation.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.JWT_SECRET || "MERCURE_SECRET_2025_REPLACE_IN_PROD";


console.log("🔄 Server starting...");
console.log("📁 Current directory:", __dirname); // This will now work correctly
console.log("🔧 Node version:", process.version);

// Database connection - MOVED TO TOP
const db = new sqlite3.Database("./mercure.db", (err) => {
  if (err) {
    console.error("❌ DB connection error:", err.message);
  } else {
    console.log("✅ SQLite DB connected");
    
    // Test database query
    db.get("SELECT COUNT(*) as count FROM members", (err, row) => {
      if (err) {
        console.error("❌ Database query failed:", err);
      } else {
        console.log(`📊 Database has ${row.count} members`);
      }
    });
  }
});

// Middleware
app.use(cors({
  origin: "http://localhost:3000", // Your React app port
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📦 Request body:', JSON.stringify(req.body).substring(0, 200));
  }
  next();
});

// Test routes
app.get("/api/test-simple", (req, res) => {
  console.log("✅ Simple test route hit!");
  res.json({ message: "Backend is working!", timestamp: new Date() });
});

app.get("/api/health", (req, res) => {
  console.log("🏥 Health check received");
  res.json({ 
    status: "OK", 
    timestamp: new Date(),
    message: "Backend is running" 
  });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mercury_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.log('❌ MongoDB connection error:', err));

// Create default admin function
async function createDefaultAdmin() {
  try {
    // Check SQLite for the admin user
    db.get("SELECT * FROM members WHERE email = ?", ['kevindelaquez@gmail.com'], async (err, row) => {
      if (err) {
        console.error('Error checking for admin user:', err);
        return;
      }

      if (!row) {
        const hashedPassword = await bcrypt.hash('867304', 10);
        
        // Insert into SQLite members table
        db.run(
          `INSERT INTO members (name, email, password, username, role, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            'KEVIN BUXTON',
            'kevindelaquez@gmail.com',
            hashedPassword,
            'delaquez',
            'treasurer',
            'approved'
          ],
          (err) => {
            if (err) return console.error('Admin creation error:', err.message);
            console.log('✅ SUPER ADMIN USER CREATED in SQLite:');
            console.log('   Email: kevindelaquez@gmail.com');
            console.log('   Password: 867304');
          }
        );
      } else {
        console.log('✅ Super admin user already exists in SQLite');
      }
    });
  } catch (error) {
    console.log('Admin creation error:', error.message);
  }
}

// Create tables if not exists
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      username TEXT UNIQUE,
      phone TEXT,
      email TEXT,
      password TEXT,
      role TEXT DEFAULT 'Member',
      balance REAL DEFAULT 0,
      status TEXT DEFAULT 'approved',
      last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS savings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      amount REAL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      type TEXT,
      amount REAL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS afterschool (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      amount REAL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      amount REAL,
      principal_amount REAL DEFAULT 0,
      interest REAL DEFAULT 0,
      late_penalty REAL DEFAULT 0,
      purpose TEXT,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      due_date DATE
    )
  `);

  db.run(`CREATE TABLE IF NOT EXISTS fines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    amount REAL,
    reason TEXT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid INTEGER DEFAULT 0,
    FOREIGN KEY (member_id) REFERENCES members(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
});

// ====================== AUTH MIDDLEWARE ======================
function authMiddleware(requiredRole) {
  return (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(401).json({ error: "Authorization header required" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Token missing" });

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) return res.status(403).json({ error: "Invalid token" });
      if (requiredRole && decoded.role !== requiredRole)
        return res.status(403).json({ error: `Access denied: ${requiredRole} only` });

      req.user = decoded;
      next();
    });
  };
}

// ====================== SAVINGS, LOANS, FINES ROUTES ======================
// These routes were missing, causing timeouts on the frontend.

app.get("/api/get-savings", (req, res) => {
  db.all("SELECT s.*, m.name as member_name FROM savings s JOIN members m ON s.member_id = m.id ORDER BY date DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/api/get-total-savings", (req, res) => {
  db.get("SELECT SUM(amount) AS total_savings FROM savings", [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ total_savings: row.total_savings || 0 });
  });
});

app.post("/api/add-savings", (req, res) => {
  const { member_id, amount } = req.body;
  if (!member_id || !amount) {
    return res.status(400).json({ success: false, error: "Member ID and amount required" });
  }
  db.run("INSERT INTO savings (member_id, amount) VALUES (?, ?)", [member_id, amount], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: "Savings added!", id: this.lastID });
  });
});

app.get("/api/get-loans", (req, res) => {
  const query = `
    SELECT loans.id, loans.member_id, members.name AS member_name,
           loans.amount, loans.status, loans.due_date
    FROM loans
    JOIN members ON loans.member_id = members.id
    ORDER BY loans.id DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/request-loan", (req, res) => {
  const { member_id, amount, purpose, reason, due_date } = req.body;
  if (!member_id || !amount || !purpose) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }
  db.run(
    "INSERT INTO loans (member_id, amount, principal_amount, purpose, reason, status, due_date) VALUES (?, ?, ?, ?, ?, 'pending', ?)",
    [member_id, amount, amount, purpose, reason || null, due_date || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: "Loan requested", loan_id: this.lastID });
    }
  );
});

app.get("/api/get-fines", (req, res) => {
  const query = `SELECT fines.*, members.name AS member_name 
                 FROM fines 
                 JOIN members ON fines.member_id = members.id
                 ORDER BY date DESC`;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/add-fine", (req, res) => {
  const { member_id, amount, reason } = req.body;
  if (!member_id || !amount || !reason) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  if (isNaN(member_id) || isNaN(amount)) {
    return res.status(400).json({ success: false, error: 'member_id and amount must be numbers' });
  }
  db.run(
    "INSERT INTO fines (member_id, amount, reason) VALUES (?, ?, ?)",
    [member_id, amount, reason],
    function(err) {
      if (err) return res.status(500).json({ success: false, error: "Failed to add fine" });
      res.json({ success: true, message: "Fine added successfully", fine_id: this.lastID });
    }
  );
});

// ====================== MEMBER EDIT/DELETE ROUTES ======================
// These routes are required for the edit and delete functionality on the Members page.

app.put("/api/members/:id", (req, res) => {
  const { id } = req.params;
  const { name, email, phone, role } = req.body;

  if (!name || !email) {
    return res.status(400).json({ success: false, error: "Name and email are required" });
  }

  db.run(
    "UPDATE members SET name = ?, email = ?, phone = ?, role = ? WHERE id = ?",
    [name, email, phone, role, id],
    function (err) {
      if (err) return res.status(500).json({ success: false, error: err.message });
      if (this.changes === 0) return res.status(404).json({ success: false, error: "Member not found" });
      res.json({ success: true, message: "Member updated successfully" });
    }
  );
});

app.delete("/api/members/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM members WHERE id = ?", id, function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (this.changes === 0) return res.status(404).json({ success: false, error: "Member not found" });
    res.json({ success: true, message: "Member deleted successfully" });
  });
});


// ====================== DASHBOARD & LEADERBOARD ROUTES ======================
app.get("/api/group-stats", (req, res) => {
  db.get("SELECT COUNT(*) AS total_members FROM members", (err, membersRow) => {
    if (err) return res.status(500).json({ error: "Failed to get members count" });

    db.get("SELECT SUM(amount) AS total_savings FROM savings", (err, savingsRow) => {
      if (err) return res.status(500).json({ error: "Failed to get total savings" });

      db.get("SELECT COUNT(*) AS active_loans FROM loans WHERE status='pending'", (err, loansRow) => {
        if (err) return res.status(500).json({ error: "Failed to get active loans count" });

        res.json({
          total_members: membersRow.total_members || 0,
          total_savings: savingsRow.total_savings || 0,
          active_loans: loansRow.active_loans || 0,
        });
      });
    });
  });
});

app.use('/api', leaderboardRoutes);

// ====================== AUTOMATION ROUTES ======================
import automationRoutes from './routes/automationRoutes.js';
app.use('/api/automation', automationRoutes);

// SMS Reminders table (formerly STK Push requests)
db.run(`
  CREATE TABLE IF NOT EXISTS sms_reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    amount REAL,
    phone_number TEXT,
    external_reference_id TEXT UNIQUE, -- Renamed from checkout_request_id
    message TEXT, -- Renamed from description, more suitable for SMS
    payment_type TEXT DEFAULT 'savings',
    prompt_type TEXT DEFAULT 'auto', -- 'auto' or 'manual'
    prompt_time TEXT, -- 'morning' or 'evening' for auto prompts
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    mpesa_reference TEXT,
    result_code TEXT,
    result_desc TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (member_id) REFERENCES members(id)
  )
`);
console.log('✅ SMS Reminders table created/checked');
// ====================== CREATE AUTOMATION TABLES ======================
db.serialize(() => {
  // Create automation logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS automation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      action_type TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id)
    )
  `);

  // Update the pending_payments table creation
db.run(`
  CREATE TABLE IF NOT EXISTS pending_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    amount REAL,
    payment_type TEXT,
    description TEXT,
    prompt_type TEXT DEFAULT 'auto', -- 'auto' or 'manual'
    prompt_time TEXT, -- 'morning' or 'evening' for auto prompts
    status TEXT DEFAULT 'pending',
    mpesa_reference TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (member_id) REFERENCES members(id)
  )
`);

  console.log('✅ Automation tables created');
});

// Route debugging
app.get("/api/debug-routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    }
  });
  res.json({ routes, total: routes.length });
});

// ====================== SERVER START ======================
app.get("/", (req, res) => res.send("Mercure API running!"));
app.get("/api/test", (req, res) => res.json({ message: "✅ API is working!" }));

// Use imported routes
// Auth routes
app.use('/api', authRoutes); // Handles /api/login, /api/register
// Member routes
app.use('/api/members', memberRoutes);
// Announcement routes
app.use('/api/announcements', announcementRoutes);

// ====================== PRODUCTION SETTINGS ======================
// Serve static files from the React frontend build directory
app.use(express.static(path.join(__dirname, '../mercure-frontend/dist')));

// The "catchall" handler: for any request that doesn't
// match one of the API routes above, send back React's index.html file.
// This is necessary for client-side routing to work in production.
app.get('*', (req, res) => {
  // Ensure the request is not for an API endpoint before sending index.html
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../mercure-frontend/dist/index.html'));
  } else {
    res.status(404).json({ error: "API endpoint not found" });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API available at: http://localhost:${PORT}/api`);
  console.log(`✅ Test endpoint: http://localhost:${PORT}/api/test`);
  
  // Create admin after server starts
  await createDefaultAdmin();
  
  console.log(`\n🎯 READY TO LOGIN WITH:`);
  console.log(`   Email: kevindelaquez@gmail.com`);
  console.log(`   Password: 867304`);

});

