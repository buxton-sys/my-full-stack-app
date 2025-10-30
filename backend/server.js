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
const PORT = process.env.PORT || 3000;
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

// Create tables - UPDATED WITH MISSING TABLES
db.serialize(() => {
  // Members table with all new fields
  db.run(`CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_code TEXT UNIQUE,
    name TEXT, username TEXT UNIQUE, phone TEXT, email TEXT UNIQUE,
    password TEXT, role TEXT DEFAULT 'Member', balance REAL DEFAULT 0,
    total_savings REAL DEFAULT 0, debts REAL DEFAULT 0, 
    afterschool REAL DEFAULT 0, loans REAL DEFAULT 0, fines REAL DEFAULT 0,
    status TEXT DEFAULT 'approved', last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // Savings table with member_code
  db.run(`CREATE TABLE IF NOT EXISTS savings (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    member_id INTEGER, 
    member_code TEXT,
    amount REAL, 
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(member_id) REFERENCES members(id)
  )`);

  // Loans table with member_code
  db.run(`CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    member_id INTEGER, 
    member_code TEXT,
    amount REAL, 
    purpose TEXT, 
    reason TEXT, 
    status TEXT DEFAULT 'pending',
    due_date DATE,
    FOREIGN KEY(member_id) REFERENCES members(id)
  )`);

  // Fines table with member_code
  db.run(`CREATE TABLE IF NOT EXISTS fines (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    member_id INTEGER, 
    member_code TEXT,
    amount REAL, 
    reason TEXT, 
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    paid INTEGER DEFAULT 0,
    FOREIGN KEY(member_id) REFERENCES members(id)
  )`);

  // Announcements table
  db.run(`CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    title TEXT, 
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // CRITICAL: Add the missing pending_transactions table
  db.run(`CREATE TABLE IF NOT EXISTS pending_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_code TEXT,
    amount REAL,
    type TEXT, -- 'savings', 'loan_repayment', 'fine_payment'
    status TEXT DEFAULT 'pending',
    proof_image TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(member_code) REFERENCES members(member_code)
  )`);

  // Add ALL real members with their actual data
  const realMembers = [
    {
      member_code: "001", name: "Hemston Odege", role: "Chairperson",
      balance: 2180, total_savings: 2180, debts: 0, afterschool: 550, loans: 0, fines: 0,
      email: "hemstonodege@gmail.com", username: "morningstar", password: "pass001", phone: "0708692752"
    },
    {
      member_code: "002", name: "James Blessing", role: "Deputy Chairperson", 
      balance: 120, total_savings: 120, debts: 600, afterschool: 250, loans: 0, fines: 0,
      email: "jamesblessings22122@gmail.com", username: "Jay Bless", password: "James2005", phone: "0759461630"
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
      email: "berylbaraza38@gmail.com", username: "Isca", password: "1234..tems", phone: "0740136631"
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

  // Insert all real members
  realMembers.forEach(member => {
    bcrypt.hash(member.password, 10, (err, hashedPassword) => {
      if (!err) {
        db.run(`INSERT OR IGNORE INTO members 
                (member_code, name, email, password, username, role, phone, balance, total_savings, debts, afterschool, loans, fines) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [
                  member.member_code, member.name, member.email, hashedPassword, 
                  member.username, member.role, member.phone, member.balance,
                  member.total_savings, member.debts, member.afterschool, member.loans, member.fines
                ],
                function(err) {
                  if (err) {
                    console.error("Error adding member:", err.message);
                  } else {
                    if (this.changes > 0) {
                      console.log(`✅ Added member: ${member.name} (${member.member_code})`);
                    }
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

// Login route - UPDATED TO RETURN MEMBER_CODE
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
        { 
          id: member.id, 
          email: member.email, 
          role: member.role,
          member_code: member.member_code 
        },
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
          username: member.username,
          member_code: member.member_code // CRITICAL: Add this for frontend
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ success: false, message: "Server error during login" });
    }
  });
});

// Members routes - UPDATED TO INCLUDE ALL FIELDS
app.get("/api/members", authenticateToken, (req, res) => {
  db.all("SELECT id, member_code, name, email, phone, role, balance, total_savings, debts, afterschool, loans, fines FROM members", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put("/api/members/:id", authenticateToken, (req, res) => {
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

// Delete Member route
app.delete("/api/members/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM members WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: "Member deleted successfully" });
  });
});

// ====================== UPDATED SAVINGS ROUTES (USE MEMBER_CODE) ======================

app.get("/api/get-savings", authenticateToken, (req, res) => {
  db.all("SELECT * FROM savings ORDER BY date DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// UPDATED: Now uses member_code and updates total_savings
app.post("/api/add-savings", authenticateToken, (req, res) => {
  const { member_code, amount } = req.body;
  
  if (!member_code || !amount) {
    return res.status(400).json({ success: false, error: "Member code and amount required" });
  }

  db.serialize(() => {
    // Get member_id from member_code
    db.get("SELECT id FROM members WHERE member_code = ?", [member_code], (err, member) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!member) return res.status(404).json({ error: "Member not found" });

      db.run("INSERT INTO savings (member_id, member_code, amount) VALUES (?, ?, ?)", 
             [member.id, member_code, amount], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        
        db.run("UPDATE members SET balance = balance + ?, total_savings = total_savings + ? WHERE member_code = ?", 
               [amount, amount, member_code], function (err) {
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
});

// ====================== UPDATED FINES ROUTES ======================

app.get("/api/get-fines", authenticateToken, (req, res) => {
  db.all("SELECT * FROM fines ORDER BY date DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/add-fine", authenticateToken, (req, res) => {
  const { member_code, amount, reason } = req.body;
  if (!member_code || !amount) {
    return res.status(400).json({ success: false, error: "Member code and amount required" });
  }

  db.get("SELECT id FROM members WHERE member_code = ?", [member_code], (err, member) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!member) return res.status(404).json({ error: "Member not found" });

    db.run("INSERT INTO fines (member_id, member_code, amount, reason) VALUES (?, ?, ?, ?)", 
      [member.id, member_code, amount, reason], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Update member's fines total
      db.run("UPDATE members SET fines = fines + ? WHERE member_code = ?", [amount, member_code]);
      
      res.json({ success: true, message: "Fine added!", id: this.lastID });
    });
  });
});

// ====================== UPDATED LOANS ROUTES ======================

app.get("/api/get-loans", authenticateToken, (req, res) => {
  db.all("SELECT * FROM loans", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/request-loan", authenticateToken, (req, res) => {
  const { member_code, amount, purpose, reason, due_date } = req.body;
  if (!member_code || !amount) {
    return res.status(400).json({ success: false, error: "Member code and amount required" });
  }

  db.get("SELECT id FROM members WHERE member_code = ?", [member_code], (err, member) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!member) return res.status(404).json({ error: "Member not found" });

    db.run("INSERT INTO loans (member_id, member_code, amount, purpose, reason, due_date) VALUES (?, ?, ?, ?, ?, ?)", 
      [member.id, member_code, amount, purpose, reason, due_date], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: "Loan requested!", id: this.lastID });
    });
  });
});

// ====================== ANNOUNCEMENTS ROUTES ======================

app.get("/api/announcements", (req, res) => {
  db.all("SELECT * FROM announcements ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/announcements", authenticateToken, (req, res) => {
  const { title, message } = req.body;
  if (!title || !message) {
    return res.status(400).json({ success: false, error: "Title and message required" });
  }
  db.run("INSERT INTO announcements (title, message) VALUES (?, ?)", 
    [title, message], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: "Announcement added!", id: this.lastID });
  });
});

app.delete("/api/announcements/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM announcements WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: "Announcement deleted successfully" });
  });
});

// ====================== DASHBOARD & STATS ROUTES ======================

app.get("/api/dashboard/stats", authenticateToken, (req, res) => {
  db.get("SELECT COUNT(*) AS total_members FROM members", (err, membersRow) => {
    db.get("SELECT SUM(amount) AS total_savings FROM savings", (err, savingsRow) => {
      db.get("SELECT COUNT(*) AS total_loans FROM loans WHERE status = 'pending'", (err, loansRow) => {
        db.get("SELECT COUNT(*) AS pending_transactions FROM pending_transactions WHERE status = 'pending'", (err, pendingRow) => {
          res.json({
            total_members: membersRow.total_members || 0,
            total_savings: savingsRow.total_savings || 0,
            pending_loans: loansRow.total_loans || 0,
            pending_approvals: pendingRow.pending_transactions || 0
          });
        });
      });
    });
  });
});

// ====================== APPROVAL SYSTEM ROUTES (FIXED) ======================

// Get user-specific data - PROTECTED
app.get("/api/user/:member_code/data", authenticateToken, (req, res) => {
  const { member_code } = req.params;
  
  // Check if user is authorized to access this data
  if (req.user.role !== 'admin' && req.user.member_code !== member_code) {
    return res.status(403).json({ error: "Access denied" });
  }
  
  db.get("SELECT * FROM members WHERE member_code = ?", [member_code], (err, member) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!member) return res.status(404).json({ error: "Member not found" });
    
    // Get user-specific savings, loans, fines
    db.all("SELECT * FROM savings WHERE member_code = ? ORDER BY date DESC", [member_code], (err, savings) => {
      db.all("SELECT * FROM loans WHERE member_code = ?", [member_code], (err, loans) => {
        db.all("SELECT * FROM fines WHERE member_code = ?", [member_code], (err, fines) => {
          res.json({
            member: {
              id: member.id,
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
        });
      });
    });
  });
});

// Pending transactions system - PROTECTED
app.post("/api/pending-transactions", authenticateToken, (req, res) => {
  const { member_code, amount, type, proof_image } = req.body;
  
  // Verify member exists
  db.get("SELECT id FROM members WHERE member_code = ?", [member_code], (err, member) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!member) return res.status(404).json({ error: "Member not found" });
    
    db.run(`INSERT INTO pending_transactions 
            (member_code, amount, type, status, proof_image) 
            VALUES (?, ?, ?, 'pending', ?)`,
            [member_code, amount, type, proof_image], 
            function(err) {
              if (err) return res.status(500).json({ error: err.message });
              
              console.log(`📧 Admin notified: New ${type} from member ${member_code}`);
              
              res.json({ 
                success: true, 
                message: "Transaction submitted for approval",
                id: this.lastID 
              });
            });
  });
});

// Get pending transactions (for admin only) - PROTECTED
app.get("/api/pending-transactions", authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }
  
  db.all("SELECT * FROM pending_transactions WHERE status = 'pending'", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Approve pending transaction (admin only) - PROTECTED
app.put("/api/pending-transactions/:id/approve", authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { id } = req.params;
  
  db.serialize(() => {
    // Get the pending transaction
    db.get("SELECT * FROM pending_transactions WHERE id = ?", [id], (err, transaction) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!transaction) return res.status(404).json({ error: "Transaction not found" });
      
      // Process based on transaction type
      if (transaction.type === 'savings') {
        // Get member_id first
        db.get("SELECT id FROM members WHERE member_code = ?", [transaction.member_code], (err, member) => {
          if (err) return res.status(500).json({ error: err.message });
          
          // Add to savings and update balance
          db.run("INSERT INTO savings (member_id, member_code, amount) VALUES (?, ?, ?)", 
                 [member.id, transaction.member_code, transaction.amount]);
          db.run("UPDATE members SET balance = balance + ?, total_savings = total_savings + ? WHERE member_code = ?",
                 [transaction.amount, transaction.amount, transaction.member_code], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Mark transaction as approved
            db.run("UPDATE pending_transactions SET status = 'approved' WHERE id = ?", [id], (err) => {
              if (err) return res.status(500).json({ error: err.message });
              res.json({ success: true, message: "Savings transaction approved" });
            });
          });
        });
      }
      else {
        // For other transaction types, just mark as approved for now
        db.run("UPDATE pending_transactions SET status = 'approved' WHERE id = ?", [id], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, message: "Transaction approved" });
        });
      }
    });
  });
});

// Reject pending transaction (admin only) - PROTECTED
app.put("/api/pending-transactions/:id/reject", authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { id } = req.params;
  const { reason } = req.body;
  
  db.run("UPDATE pending_transactions SET status = 'rejected', rejection_reason = ? WHERE id = ?",
         [reason, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    console.log(`📧 Member notified: Your transaction was rejected - ${reason}`);
    
    res.json({ success: true, message: "Transaction rejected" });
  });
});

// ====================== SERVER START ======================
app.get("/", (req, res) => res.send("Mercure API running!"));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}/api`);
  console.log(`✅ Health: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Login: kevinbuxton2005@gmail.com / @Delaquez6`);
  console.log(`📊 New Features: Approval System, Member Codes, Enhanced Security`);
});
