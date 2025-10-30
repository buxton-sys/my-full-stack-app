import express from "express";
import sqlite3 from "sqlite3";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000; // Changed to 3000 for backend
const SECRET_KEY = process.env.JWT_SECRET || "MERCURE_SECRET_2025";

console.log("🔄 Server starting...");

// Database connection
const db = new sqlite3.Database("./mercure.db", (err) => {
  if (err) {
    console.error("❌ DB connection error:", err.message);
  } else {
    console.log("✅ SQLite DB connected");
  }
});

// Middleware - FIXED CORS (frontend on 3001, backend on 3000)
app.use(cors({
  origin:'*',// React frontend port
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);
  next();
});

// Create tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, username TEXT UNIQUE, phone TEXT, email TEXT UNIQUE,
    password TEXT, role TEXT DEFAULT 'Member', balance REAL DEFAULT 0,
    status TEXT DEFAULT 'approved', last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS savings (
    id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, amount REAL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, amount REAL,
    principal_amount REAL DEFAULT 0, purpose TEXT, reason TEXT,
    status TEXT DEFAULT 'pending', due_date DATE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS fines (
    id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, amount REAL,
    reason TEXT, date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, paid INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add all members
  const members = [
    {
      name: "Kevin Buxton",
      phone: "0112009871", 
      email: "kevinbuxton2005@gmail.com",
      username: "delaquez",
      role: "treasurer",
      password: "@Delaquez6"
    },
    {
      name: "James blessings",
      phone: "0759461630",
      email: "Jamesblessings22122@gmail.com",
      username: "Jaybless", 
      role: "Chairperson",
      password: "James2005"
    },
    {
      name: "Ashley Isca",
      phone: "0740136631",
      email: "berylbaraza38@gmail.com",
      username: "Isca",
      role: "Organiser", 
      password: "1234..tems"
    }
  ];

  // Add default admin and all members
  bcrypt.hash('867304', 10, (err, hashedPassword) => {
    if (!err) {
      db.run(`INSERT OR IGNORE INTO members (name, email, password, username, role, phone) 
              VALUES (?, ?, ?, ?, ?, ?)`, 
              ['KEVIN BUXTON', 'kevindelaquez@gmail.com', hashedPassword, 'delaquez', 'treasurer', '0112009871']);
    }
  });

  // Add other members
  members.forEach(member => {
    bcrypt.hash(member.password, 10, (err, hashedPassword) => {
      if (!err) {
        db.run(`INSERT OR IGNORE INTO members (name, email, password, username, role, phone) 
                VALUES (?, ?, ?, ?, ?, ?)`, 
                [member.name, member.email, hashedPassword, member.username, member.role, member.phone],
                function(err) {
                  if (err) {
                    console.error("Error adding member:", err.message);
                  } else {
                    console.log(`✅ Added member: ${member.name}`);
                  }
                });
      }
    });
  });
});

// ====================== ESSENTIAL ROUTES ======================

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

app.get("/api/test", (req, res) => {
  res.json({ message: "✅ API is working!" });
});

// Login route
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password required" });
  }

  db.get("SELECT * FROM members WHERE email = ?", [email], async (err, member) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    
    if (!member) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    try {
      const match = await bcrypt.compare(password, member.password);
      
      if (!match) {
        return res.status(401).json({ success: false, message: "Invalid password" });
      }

      const token = jwt.sign(
        { id: member.id, email: member.email, role: member.role },
        SECRET_KEY,
        { expiresIn: "7d" }
      );

      console.log("✅ Login successful for:", member.email);
      
      res.json({
        success: true,
        message: "Login successful",
        token: token,
        role: member.role,
        user: {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          username: member.username
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ success: false, message: "Server error during login" });
    }
  });
});

// Members routes
app.get("/api/members", (req, res) => {
  db.all("SELECT id, name, email, phone, role, balance FROM members", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

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
      res.json({ success: true, message: "Member updated successfully" });
    }
  );
});

// Savings routes
app.get("/api/get-savings", (req, res) => {
  db.all("SELECT * FROM savings ORDER BY date DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
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

// Improved Add Savings route - UPDATES BALANCE AUTOMATICALLY
app.post("/api/add-savings", (req, res) => {
  const { member_id, amount } = req.body;
  
  if (!member_id || !amount) {
    return res.status(400).json({ success: false, error: "Member ID and amount required" });
  }

  // Start a transaction
  db.serialize(() => {
    // 1. Add to savings table
    db.run("INSERT INTO savings (member_id, amount) VALUES (?, ?)", [member_id, amount], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // 2. Update member's balance
      db.run("UPDATE members SET balance = balance + ? WHERE id = ?", [amount, member_id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        
        res.json({ 
          success: true, 
          message: "Savings added and balance updated!", 
          savingsId: this.lastID 
        });
      });
    });
  });
});

// Get member balance route
app.get("/api/members/:id/balance", (req, res) => {
  const { id } = req.params;
  
  db.get("SELECT balance FROM members WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Member not found" });
    
    res.json({ balance: row.balance });
  });
});

// Dashboard stats
app.get("/api/group-stats", (req, res) => {
  db.get("SELECT COUNT(*) AS total_members FROM members", (err, membersRow) => {
    if (err) return res.status(500).json({ error: "Failed to get members count" });

    db.get("SELECT SUM(amount) AS total_savings FROM savings", (err, savingsRow) => {
      if (err) return res.status(500).json({ error: "Failed to get total savings" });

      res.json({
        total_members: membersRow.total_members || 0,
        total_savings: savingsRow.total_savings || 0,
        active_loans: 0 // Simplified for now
      });
    });
  });
});

// ====================== SERVER START ======================
app.get("/", (req, res) => res.send("Mercure API running!"));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}/api`);
  console.log(`✅ Health: http://localhost:${PORT}/api/health`);
  console.log(`🎯 Login: kevindelaquez@gmail.com / 867304`);
});





