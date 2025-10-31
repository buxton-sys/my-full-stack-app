import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || "MERCURE_SECRET_2025";

console.log("🔄 Server starting...");

const MONGODB_URI = process.env.MONGODB_URI;
const sqliteDB = new sqlite3.Database(':memory:');
let useMongoDB = false;
let mongoDBStatus = "disconnected";

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

function initializeSQLite() {
  sqliteDB.serialize(() => {
    sqliteDB.run(`CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_code TEXT UNIQUE,
      name TEXT, username TEXT UNIQUE, phone TEXT, email TEXT UNIQUE,
      password TEXT, role TEXT DEFAULT 'Member', balance REAL DEFAULT 0,
      total_savings REAL DEFAULT 0, debts REAL DEFAULT 0, 
      afterschool REAL DEFAULT 0, loans REAL DEFAULT 0, fines REAL DEFAULT 0,
      status TEXT DEFAULT 'approved', last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    sqliteDB.run(`CREATE TABLE IF NOT EXISTS savings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      member_id INTEGER, 
      member_code TEXT,
      amount REAL, 
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    sqliteDB.run(`CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      member_id INTEGER, 
      member_code TEXT,
      amount REAL, 
      purpose TEXT, 
      reason TEXT, 
      status TEXT DEFAULT 'pending',
      due_date DATE
    )`);

    sqliteDB.run(`CREATE TABLE IF NOT EXISTS fines (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      member_id INTEGER, 
      member_code TEXT,
      amount REAL, 
      reason TEXT, 
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
      paid INTEGER DEFAULT 0
    )`);

    sqliteDB.run(`CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      title TEXT, 
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    sqliteDB.run(`CREATE TABLE IF NOT EXISTS pending_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_code TEXT,
      amount REAL,
      type TEXT,
      status TEXT DEFAULT 'pending',
      proof_image TEXT,
      rejection_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

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

    realMembers.forEach(member => {
      bcrypt.hash(member.password, 10, (err, hashedPassword) => {
        if (!err) {
          sqliteDB.run(`INSERT OR IGNORE INTO members 
            (member_code, name, email, password, username, role, phone, balance, total_savings, debts, afterschool, loans, fines) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [
              member.member_code, member.name, member.email, hashedPassword, 
              member.username, member.role, member.phone, member.balance,
              member.total_savings, member.debts, member.afterschool, member.loans, member.fines
            ]);
        }
      });
    });

    const realLoans = [
      { member_code: "007", amount: 2000, purpose: "Personal Loan", reason: "Emergency funding", due_date: "2024-12-31", status: "approved" }
    ];

    const realFines = [
      { member_code: "008", amount: 100, reason: "Late payment penalty" },
      { member_code: "009", amount: 100, reason: "Meeting absence fine" },
      { member_code: "011", amount: 100, reason: "Late submission fine" }
    ];

    realLoans.forEach(loan => {
      sqliteDB.get("SELECT id FROM members WHERE member_code = ?", [loan.member_code], (err, member) => {
        if (!err && member) {
          sqliteDB.run(`INSERT OR IGNORE INTO loans (member_id, member_code, amount, purpose, reason, due_date, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [member.id, loan.member_code, loan.amount, loan.purpose, loan.reason, loan.due_date, loan.status]);
        }
      });
    });

    realFines.forEach(fine => {
      sqliteDB.get("SELECT id FROM members WHERE member_code = ?", [fine.member_code], (err, member) => {
        if (!err && member) {
          sqliteDB.run(`INSERT OR IGNORE INTO fines (member_id, member_code, amount, reason) 
            VALUES (?, ?, ?, ?)`,
            [member.id, fine.member_code, fine.amount, fine.reason]);
        }
      });
    });
  });
}

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
      }
    }
  } catch (error) {
    console.error('Error initializing members:', error);
  }
}

async function createRealLoansAndFines() {
  try {
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
        const existingLoan = await Loans.findOne({ member_code: loanData.member_code, amount: loanData.amount });
        if (!existingLoan) {
          await Loans.create({ member_id: member._id, ...loanData });
        }
      }
    }

    for (const fineData of realFines) {
      const member = await Member.findOne({ member_code: fineData.member_code });
      if (member) {
        const existingFine = await Fines.findOne({ member_code: fineData.member_code, amount: fineData.amount });
        if (!existingFine) {
          await Fines.create({ member_id: member._id, ...fineData });
        }
      }
    }
  } catch (error) {
    console.error('Error creating loans and fines:', error);
  }
}

async function connectToDatabases() {
  try {
    if (MONGODB_URI) {
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000 });
      useMongoDB = true;
      mongoDBStatus = "connected";
      console.log('✅ MongoDB Connected');
      await initializeRealMembers();
      await createRealLoansAndFines();
    } else {
      throw new Error("No MongoDB URI provided");
    }
  } catch (error) {
    console.error('❌ MongoDB failed, using SQLite');
    useMongoDB = false;
    mongoDBStatus = "failed - using SQLite";
    initializeSQLite();
  }
}

async function getMembers() {
  if (useMongoDB) {
    return await Member.find({}, { password: 0 });
  } else {
    return new Promise((resolve, reject) => {
      sqliteDB.all("SELECT id, member_code, name, email, phone, role, balance, total_savings, debts, afterschool, loans, fines FROM members", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

async function findMemberByUsername(username) {
  if (useMongoDB) {
    return await Member.findOne({ username });
  } else {
    return new Promise((resolve, reject) => {
      sqliteDB.get("SELECT * FROM members WHERE username = ?", [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
}

async function findMemberByCode(member_code) {
  if (useMongoDB) {
    return await Member.findOne({ member_code });
  } else {
    return new Promise((resolve, reject) => {
      sqliteDB.get("SELECT * FROM members WHERE member_code = ?", [member_code], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
}

app.use(cors({ origin: '*', credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);
  next();
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: "Access token required" });
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: "Invalid or expired token" });
    req.user = user;
    next();
  });
};

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date(), database: useMongoDB ? "MongoDB" : "SQLite" });
});

app.get("/api/test", (req, res) => {
  res.json({ message: "✅ API is working!" });
});

app.get("/api/database-status", (req, res) => {
  res.json({ primary_database: useMongoDB ? "MongoDB" : "SQLite", mongodb_status: mongoDBStatus, sqlite_status: "active", timestamp: new Date() });
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("📍 Login attempt for username:", username);
    console.log("🔧 Using database:", useMongoDB ? "MongoDB" : "SQLite");

    let member = await findMemberByUsername(username);
    if (!member) return res.status(401).json({ success: false, message: "Invalid username or password" });

    const match = await bcrypt.compare(password, member.password);
    if (!match) return res.status(401).json({ success: false, message: "Invalid username or password" });

    const tokenPayload = { id: useMongoDB ? member._id : member.id, username: member.username, role: member.role, member_code: member.member_code };
    const token = jwt.sign(tokenPayload, SECRET_KEY, { expiresIn: "7d" });

    res.json({
      success: true,
      message: `Login successful (${useMongoDB ? "MongoDB" : "SQLite"})`,
      token: token,
      role: member.role,
      user: { id: useMongoDB ? member._id : member.id, name: member.name, username: member.username, role: member.role, member_code: member.member_code }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error during login", database: useMongoDB ? "MongoDB" : "SQLite" });
  }
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER || 'your-email@gmail.com', pass: process.env.EMAIL_PASS || 'your-app-password' }
});

app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    let member;
    if (useMongoDB) {
      member = await Member.findOne({ email });
    } else {
      member = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT * FROM members WHERE email = ?", [email], (err, row) => { if (err) reject(err); else resolve(row); });
      });
    }
    if (!member) return res.status(404).json({ success: false, message: "Email not found in our system" });

    const mailOptions = {
      from: process.env.EMAIL_USER, to: email, subject: 'Mercure Group - Password Reminder',
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Mercure Group Password Reminder</h2>
        <p>Hello ${member.name},</p><p>You requested a password reminder for your account.</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Your login details:</strong></p>
          <p style="margin: 5px 0;"><strong>Username:</strong> ${member.username}</p>
          <p style="margin: 5px 0;"><strong>Password:</strong> Use your registered password</p>
        </div>
        <p><strong>Login at:</strong> https://mercure-group-system.surge.sh</p>
        <hr style="margin: 30px 0;">
        <p style="color: #6B7280; font-size: 14px;">If you didn't request this, please ignore this email.</p></div>`
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Password reminder sent to your email" });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ success: false, message: "Error sending password reminder email" });
  }
});

app.get("/api/members", async (req, res) => {
  try {
    const members = await getMembers();
    const roleOrder = { 'Chairperson': 1, 'Deputy Chairperson': 2, 'Secretary': 3, 'Treasurer': 4, 'Organizer': 5, 'Head of Security': 6, 'Editor': 7, 'Member': 8 };
    const sortedMembers = members.sort((a, b) => { const orderA = roleOrder[a.role] || 8; const orderB = roleOrder[b.role] || 8; return orderA - orderB || a.name.localeCompare(b.name); });
    res.json(sortedMembers);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put("/api/members/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params; const { name, email, phone, role } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, error: "Name and email are required" });
    if (useMongoDB) { await Member.findByIdAndUpdate(id, { name, email, phone, role }); } else {
      sqliteDB.run("UPDATE members SET name = ?, email = ?, phone = ?, role = ? WHERE id = ?", [name, email, phone, role, id]);
    }
    res.json({ success: true, message: "Member updated successfully" });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete("/api/members/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (useMongoDB) { await Member.findByIdAndDelete(id); } else { sqliteDB.run("DELETE FROM members WHERE id = ?", [id]); }
    res.json({ success: true, message: "Member deleted successfully" });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get("/api/get-savings", authenticateToken, async (req, res) => {
  try {
    let savings;
    if (useMongoDB) { savings = await Savings.find().sort({ date: -1 }); } else {
      savings = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT * FROM savings ORDER BY date DESC", [], (err, rows) => { if (err) reject(err); else resolve(rows); });
      });
    }
    res.json(savings);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/add-saving", authenticateToken, async (req, res) => {
  try {
    const { member_code, amount } = req.body;
    if (!member_code || !amount) return res.status(400).json({ success: false, error: "Member code and amount required" });
    const member = await findMemberByCode(member_code);
    if (!member) return res.status(404).json({ error: "Member not found" });

    if (useMongoDB) {
      const saving = await Savings.create({ member_id: member._id, member_code, amount });
      await Member.findByIdAndUpdate(member._id, { $inc: { balance: amount, total_savings: amount } });
      res.json({ success: true, message: "Savings added and balance updated!", savingsId: saving._id });
    } else {
      sqliteDB.run("INSERT INTO savings (member_id, member_code, amount) VALUES (?, ?, ?)", [member.id, member_code, amount], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        sqliteDB.run("UPDATE members SET balance = balance + ?, total_savings = total_savings + ? WHERE member_code = ?", [amount, amount, member_code]);
        res.json({ success: true, message: "Savings added and balance updated!", savingsId: this.lastID });
      });
    }
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/afterschool", async (req, res) => {
  try {
    let members;
    if (useMongoDB) { members = await Member.find({ afterschool: { $gt: 0 } }); } else {
      members = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT * FROM members WHERE afterschool > 0", [], (err, rows) => { if (err) reject(err); else resolve(rows); });
      });
    }
    res.json(members || []);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/afterschool/total", async (req, res) => {
  try {
    let total;
    if (useMongoDB) {
      const result = await Member.aggregate([{ $group: { _id: null, total: { $sum: "$afterschool" } } }]);
      total = result[0]?.total || 0;
    } else {
      total = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT SUM(afterschool) AS total FROM members", [], (err, row) => { if (err) reject(err); else resolve(row?.total || 0); });
      });
    }
    res.json({ total });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/get-fines", authenticateToken, async (req, res) => {
  try {
    let fines;
    if (useMongoDB) { fines = await Fines.find().sort({ date: -1 }); } else {
      fines = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT * FROM fines ORDER BY date DESC", [], (err, rows) => { if (err) reject(err); else resolve(rows); });
      });
    }
    res.json(fines);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/add-fine", authenticateToken, async (req, res) => {
  try {
    const { member_code, amount, reason } = req.body;
    if (!member_code || !amount) return res.status(400).json({ success: false, error: "Member code and amount required" });
    const member = await findMemberByCode(member_code);
    if (!member) return res.status(404).json({ error: "Member not found" });

    if (useMongoDB) {
      const fine = await Fines.create({ member_id: member._id, member_code, amount, reason });
      await Member.findByIdAndUpdate(member._id, { $inc: { fines: amount } });
      res.json({ success: true, message: "Fine added!", id: fine._id });
    } else {
      sqliteDB.run("INSERT INTO fines (member_id, member_code, amount, reason) VALUES (?, ?, ?, ?)", [member.id, member_code, amount, reason], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        sqliteDB.run("UPDATE members SET fines = fines + ? WHERE member_code = ?", [amount, member_code]);
        res.json({ success: true, message: "Fine added!", id: this.lastID });
      });
    }
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/pay-fine-pending", authenticateToken, async (req, res) => {
  try {
    const { member_code, fine_id, amount } = req.body;
    if (!member_code || !fine_id || !amount) return res.status(400).json({ success: false, error: "Member code, fine ID and amount required" });

    if (useMongoDB) {
      const transaction = await PendingTransaction.create({ member_code, amount, type: 'fine_payment', proof_image: fine_id });
      res.json({ success: true, message: "Fine payment submitted for admin approval", id: transaction._id });
    } else {
      sqliteDB.run("INSERT INTO pending_transactions (member_code, amount, type, proof_image) VALUES (?, ?, 'fine_payment', ?)", [member_code, amount, fine_id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Fine payment submitted for admin approval", id: this.lastID });
      });
    }
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/savings-with-members", async (req, res) => {
  try {
    let savings;
    if (useMongoDB) {
      savings = await Savings.find().populate('member_id', 'name member_code').sort({ date: -1 });
    } else {
      savings = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT s.*, m.name FROM savings s JOIN members m ON s.member_code = m.member_code ORDER BY s.date DESC", [], (err, rows) => {
          if (err) reject(err); else resolve(rows);
        });
      });
    }
    res.json(savings || []);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/loans-with-members", async (req, res) => {
  try {
    let loans;
    if (useMongoDB) {
      loans = await Loans.find().populate('member_id', 'name member_code').sort({ due_date: -1 });
    } else {
      loans = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT l.*, m.name FROM loans l JOIN members m ON l.member_code = m.member_code ORDER BY l.due_date DESC", [], (err, rows) => {
          if (err) reject(err); else resolve(rows);
        });
      });
    }
    res.json(loans || []);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/fines-with-members", async (req, res) => {
  try {
    let fines;
    if (useMongoDB) {
      fines = await Fines.find().populate('member_id', 'name member_code').sort({ date: -1 });
    } else {
      fines = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT f.*, m.name FROM fines f JOIN members m ON f.member_code = m.member_code ORDER BY f.date DESC", [], (err, rows) => {
          if (err) reject(err); else resolve(rows);
        });
      });
    }
    res.json(fines || []);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/group-progress", async (req, res) => {
  try {
    let currentTotal, totalMembers;
    if (useMongoDB) {
      const totalSavings = await Member.aggregate([{ $group: { _id: null, current_total: { $sum: "$total_savings" } } }]);
      currentTotal = totalSavings[0]?.current_total || 0;
      totalMembers = await Member.countDocuments();
    } else {
      const savingsResult = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT SUM(total_savings) AS current_total FROM members", [], (err, row) => { if (err) reject(err); else resolve(row); });
      });
      const membersResult = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT COUNT(*) AS total_members FROM members", [], (err, row) => { if (err) reject(err); else resolve(row); });
      });
      currentTotal = savingsResult?.current_total || 0;
      totalMembers = membersResult?.total_members || 11;
    }

    const dailyTarget = 30;
    const yearlyTarget = dailyTarget * 365 * totalMembers;
    const progress = (currentTotal / yearlyTarget) * 100;
    
    res.json({
      current_total: currentTotal, daily_target: dailyTarget, yearly_target: yearlyTarget,
      progress_percentage: progress.toFixed(2), total_members: totalMembers,
      message: `Progress: ${progress.toFixed(2)}% of yearly target`
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/members-dropdown", async (req, res) => {
  try {
    let members;
    if (useMongoDB) {
      members = await Member.find({}, 'member_code name').sort({ name: 1 });
    } else {
      members = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT member_code, name FROM members ORDER BY name", [], (err, rows) => { if (err) reject(err); else resolve(rows); });
      });
    }
    res.json(members);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/get-loans", authenticateToken, async (req, res) => {
  try {
    let loans;
    if (useMongoDB) { loans = await Loans.find(); } else {
      loans = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT * FROM loans", [], (err, rows) => { if (err) reject(err); else resolve(rows); });
      });
    }
    res.json(loans);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/request-loan", authenticateToken, async (req, res) => {
  try {
    const { member_code, amount, purpose, reason, due_date } = req.body;
    if (!member_code || !amount) return res.status(400).json({ success: false, error: "Member code and amount required" });
    const member = await findMemberByCode(member_code);
    if (!member) return res.status(404).json({ error: "Member not found" });

    if (useMongoDB) {
      const loan = await Loans.create({ member_id: member._id, member_code, amount, purpose, reason, due_date });
      res.json({ success: true, message: "Loan requested!", id: loan._id });
    } else {
      sqliteDB.run("INSERT INTO loans (member_id, member_code, amount, purpose, reason, due_date) VALUES (?, ?, ?, ?, ?, ?)", 
        [member.id, member_code, amount, purpose, reason, due_date], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Loan requested!", id: this.lastID });
      });
    }
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/announcements", async (req, res) => {
  try {
    let announcements;
    if (useMongoDB) { announcements = await Announcement.find().sort({ created_at: -1 }); } else {
      announcements = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT * FROM announcements ORDER BY created_at DESC", [], (err, rows) => { if (err) reject(err); else resolve(rows); });
      });
    }
    res.json(announcements);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/announcements", authenticateToken, async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, error: "Title and message required" });

    if (useMongoDB) {
      const announcement = await Announcement.create({ title, message });
      res.json({ success: true, message: "Announcement added!", id: announcement._id });
    } else {
      sqliteDB.run("INSERT INTO announcements (title, message) VALUES (?, ?)", [title, message], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Announcement added!", id: this.lastID });
      });
    }
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete("/api/announcements/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (useMongoDB) { await Announcement.findByIdAndDelete(id); } else { sqliteDB.run("DELETE FROM announcements WHERE id = ?", [id]); }
    res.json({ success: true, message: "Announcement deleted successfully" });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
  try {
    let total_members, total_savings, total_loans, pending_transactions;
    
    if (useMongoDB) {
      total_members = await Member.countDocuments();
      const total_savings_result = await Savings.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]);
      total_savings = total_savings_result[0]?.total || 0;
      total_loans = await Loans.countDocuments({ status: 'pending' });
      pending_transactions = await PendingTransaction.countDocuments({ status: 'pending' });
    } else {
      total_members = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT COUNT(*) AS total FROM members", [], (err, row) => { if (err) reject(err); else resolve(row?.total || 0); });
      });
      total_savings = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT SUM(amount) AS total FROM savings", [], (err, row) => { if (err) reject(err); else resolve(row?.total || 0); });
      });
      total_loans = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT COUNT(*) AS total FROM loans WHERE status = 'pending'", [], (err, row) => { if (err) reject(err); else resolve(row?.total || 0); });
      });
      pending_transactions = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT COUNT(*) AS total FROM pending_transactions WHERE status = 'pending'", [], (err, row) => { if (err) reject(err); else resolve(row?.total || 0); });
      });
    }

    res.json({ total_members, total_savings, pending_loans: total_loans, pending_approvals: pending_transactions });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/leaderboard/top-savers", async (req, res) => {
  try {
    let topSavers;
    if (useMongoDB) {
      topSavers = await Member.find({ balance: { $gt: 0 } })
        .select('member_code name role balance total_savings debts afterschool')
        .sort({ balance: -1 }).limit(10);
    } else {
      topSavers = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT member_code, name, role, balance, total_savings, debts, afterschool FROM members WHERE balance > 0 ORDER BY balance DESC LIMIT 10", [], (err, rows) => {
          if (err) reject(err); else resolve(rows);
        });
      });
    }
    res.json(topSavers);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/get-total-savings", async (req, res) => {
  try {
    let total;
    if (useMongoDB) {
      const result = await Savings.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]);
      total = result[0]?.total || 0;
    } else {
      total = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT SUM(amount) AS total FROM savings", [], (err, row) => { if (err) reject(err); else resolve(row?.total || 0); });
      });
    }
    res.json({ total });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/group-stats", async (req, res) => {
  try {
    let total_members, total_savings, active_loans;
    
    if (useMongoDB) {
      total_members = await Member.countDocuments();
      const total_savings_result = await Savings.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]);
      total_savings = total_savings_result[0]?.total || 0;
      active_loans = await Loans.countDocuments({ status: 'approved' });
    } else {
      total_members = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT COUNT(*) AS total FROM members", [], (err, row) => { if (err) reject(err); else resolve(row?.total || 0); });
      });
      total_savings = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT SUM(amount) AS total FROM savings", [], (err, row) => { if (err) reject(err); else resolve(row?.total || 0); });
      });
      active_loans = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT COUNT(*) AS total FROM loans WHERE status = 'approved'", [], (err, row) => { if (err) reject(err); else resolve(row?.total || 0); });
      });
    }

    res.json({ total_members, total_savings, active_loans });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/financial/summary", async (req, res) => {
  try {
    let total_savings, total_loans, total_fines;
    
    if (useMongoDB) {
      const total_savings_result = await Savings.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]);
      const total_loans_result = await Loans.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
      const total_fines_result = await Fines.aggregate([{ $match: { paid: false } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
      total_savings = total_savings_result[0]?.total || 0;
      total_loans = total_loans_result[0]?.total || 0;
      total_fines = total_fines_result[0]?.total || 0;
    } else {
      total_savings = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT SUM(amount) AS total FROM savings", [], (err, row) => { if (err) reject(err); else resolve(row?.total || 0); });
      });
      total_loans = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT SUM(amount) AS total FROM loans WHERE status = 'approved'", [], (err, row) => { if (err) reject(err); else resolve(row?.total || 0); });
      });
      total_fines = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT SUM(amount) AS total FROM fines WHERE paid = 0", [], (err, row) => { if (err) reject(err); else resolve(row?.total || 0); });
      });
    }

    res.json({ total_savings, total_loans, total_fines });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/user/:member_code/data", authenticateToken, async (req, res) => {
  try {
    const { member_code } = req.params;
    if (req.user.role !== 'admin' && req.user.member_code !== member_code) return res.status(403).json({ error: "Access denied" });
    
    let member, savings, loans, fines;
    
    if (useMongoDB) {
      member = await Member.findOne({ member_code });
      savings = await Savings.find({ member_code }).sort({ date: -1 });
      loans = await Loans.find({ member_code });
      fines = await Fines.find({ member_code });
    } else {
      member = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT * FROM members WHERE member_code = ?", [member_code], (err, row) => { if (err) reject(err); else resolve(row); });
      });
      savings = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT * FROM savings WHERE member_code = ? ORDER BY date DESC", [member_code], (err, rows) => { if (err) reject(err); else resolve(rows); });
      });
      loans = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT * FROM loans WHERE member_code = ?", [member_code], (err, rows) => { if (err) reject(err); else resolve(rows); });
      });
      fines = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT * FROM fines WHERE member_code = ?", [member_code], (err, rows) => { if (err) reject(err); else resolve(rows); });
      });
    }

    if (!member) return res.status(404).json({ error: "Member not found" });

    res.json({
      member: { id: useMongoDB ? member._id : member.id, member_code: member.member_code, name: member.name, role: member.role, balance: member.balance, total_savings: member.total_savings, debts: member.debts, afterschool: member.afterschool, loans: member.loans, fines: member.fines },
      savings: savings || [], loans: loans || [], fines: fines || []
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/pending-transactions", authenticateToken, async (req, res) => {
  try {
    const { member_code, amount, type, proof_image } = req.body;
    const member = await findMemberByCode(member_code);
    if (!member) return res.status(404).json({ error: "Member not found" });

    if (useMongoDB) {
      const transaction = await PendingTransaction.create({ member_code, amount, type, proof_image });
      res.json({ success: true, message: "Transaction submitted for approval", id: transaction._id });
    } else {
      sqliteDB.run("INSERT INTO pending_transactions (member_code, amount, type, proof_image) VALUES (?, ?, ?, ?)", [member_code, amount, type, proof_image], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Transaction submitted for approval", id: this.lastID });
      });
    }
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/pending-transactions", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin access required" });
    
    let transactions;
    if (useMongoDB) {
      transactions = await PendingTransaction.find({ status: 'pending' }).populate('member_id', 'name').sort({ created_at: -1 });
    } else {
      transactions = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT pt.*, m.name FROM pending_transactions pt JOIN members m ON pt.member_code = m.member_code WHERE pt.status = 'pending' ORDER BY pt.created_at DESC", [], (err, rows) => {
          if (err) reject(err); else resolve(rows);
        });
      });
    }
    res.json(transactions);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put("/api/pending-transactions/:id/approve", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin access required" });
    const { id } = req.params;

    if (useMongoDB) {
      const transaction = await PendingTransaction.findById(id);
      if (!transaction) return res.status(404).json({ error: "Transaction not found" });
      const member = await Member.findOne({ member_code: transaction.member_code });
      if (!member) return res.status(404).json({ error: "Member not found" });

      if (transaction.type === 'savings') {
        await Savings.create({ member_id: member._id, member_code: transaction.member_code, amount: transaction.amount });
        await Member.findByIdAndUpdate(member._id, { $inc: { balance: transaction.amount, total_savings: transaction.amount } });
      } else if (transaction.type === 'loan_repayment') {
        await Loans.findByIdAndUpdate(transaction.proof_image, { $inc: { amount: -transaction.amount } });
      } else if (transaction.type === 'fine_payment') {
        await Fines.findByIdAndUpdate(transaction.proof_image, { paid: true });
      } else if (transaction.type === 'loan_request') {
        const loanData = JSON.parse(transaction.proof_image || '{}');
        await Loans.create({ member_id: member._id, member_code: transaction.member_code, amount: transaction.amount, purpose: loanData.purpose, reason: loanData.reason, due_date: loanData.due_date, status: 'approved' });
      }

      await PendingTransaction.findByIdAndUpdate(id, { status: 'approved' });
      res.json({ success: true, message: "Transaction approved successfully" });
    } else {
      sqliteDB.get("SELECT * FROM pending_transactions WHERE id = ?", [id], (err, transaction) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!transaction) return res.status(404).json({ error: "Transaction not found" });

        if (transaction.type === 'savings') {
          sqliteDB.get("SELECT id FROM members WHERE member_code = ?", [transaction.member_code], (err, member) => {
            if (err) return res.status(500).json({ error: err.message });
            sqliteDB.run("INSERT INTO savings (member_id, member_code, amount) VALUES (?, ?, ?)", [member.id, transaction.member_code, transaction.amount]);
            sqliteDB.run("UPDATE members SET balance = balance + ?, total_savings = total_savings + ? WHERE member_code = ?", [transaction.amount, transaction.amount, transaction.member_code]);
            sqliteDB.run("UPDATE pending_transactions SET status = 'approved' WHERE id = ?", [id]);
            res.json({ success: true, message: "Savings transaction approved" });
          });
        } else {
          sqliteDB.run("UPDATE pending_transactions SET status = 'approved' WHERE id = ?", [id]);
          res.json({ success: true, message: "Transaction approved" });
        }
      });
    }
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put("/api/pending-transactions/:id/reject", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin access required" });
    const { id } = req.params; const { reason } = req.body;

    if (useMongoDB) {
      await PendingTransaction.findByIdAndUpdate(id, { status: 'rejected', rejection_reason: reason });
    } else {
      sqliteDB.run("UPDATE pending_transactions SET status = 'rejected', rejection_reason = ? WHERE id = ?", [reason, id]);
    }
    res.json({ success: true, message: "Transaction rejected" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, username, password, phone } = req.body;
    if (!name || !email || !username || !password) return res.status(400).json({ success: false, error: "All fields are required" });

    let existingUser;
    if (useMongoDB) {
      existingUser = await Member.findOne({ $or: [{ email }, { username }] });
    } else {
      existingUser = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT * FROM members WHERE email = ? OR username = ?", [email, username], (err, row) => { if (err) reject(err); else resolve(row); });
      });
    }
    
    if (existingUser) return res.status(400).json({ success: false, error: "User already exists with this email or username" });

    let memberCount;
    if (useMongoDB) { memberCount = await Member.countDocuments(); } else {
      memberCount = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT COUNT(*) AS count FROM members", [], (err, row) => { if (err) reject(err); else resolve(row?.count || 0); });
      });
    }

    const member_code = String(memberCount + 1).padStart(3, '0');
    const hashedPassword = await bcrypt.hash(password, 10);

    if (useMongoDB) {
      const newMember = await Member.create({ member_code, name, email, username, password: hashedPassword, phone, role: 'Member', balance: 0, total_savings: 0, debts: 0, afterschool: 0, loans: 0, fines: 0 });
      res.json({ success: true, message: "Registration successful!", member_code: newMember.member_code });
    } else {
      sqliteDB.run("INSERT INTO members (member_code, name, email, username, password, phone, role) VALUES (?, ?, ?, ?, ?, ?, 'Member')", 
        [member_code, name, email, username, hashedPassword, phone], function(err) {
        if (err) return res.status(500).json({ success: false, error: "Registration failed" });
        res.json({ success: true, message: "Registration successful!", member_code: member_code });
      });
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, error: "Registration failed" });
  }
});

app.put("/api/loans/:id/approve", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (useMongoDB) {
      await Loans.findByIdAndUpdate(id, { status: 'approved' });
    } else {
      sqliteDB.run("UPDATE loans SET status = 'approved' WHERE id = ?", [id]);
    }
    res.json({ success: true, message: "Loan approved successfully!" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put("/api/loans/:id/reject", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params; const { reason } = req.body;
    if (useMongoDB) {
      await Loans.findByIdAndUpdate(id, { status: 'rejected', reason: reason || "No reason provided" });
    } else {
      sqliteDB.run("UPDATE loans SET status = 'rejected', reason = ? WHERE id = ?", [reason || "No reason provided", id]);
    }
    res.json({ success: true, message: "Loan rejected successfully!" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put("/api/fines/:id/pay", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (useMongoDB) {
      await Fines.findByIdAndUpdate(id, { paid: true });
    } else {
      sqliteDB.run("UPDATE fines SET paid = 1 WHERE id = ?", [id]);
    }
    res.json({ success: true, message: "Fine marked as paid!" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete("/api/:type/:id", authenticateToken, async (req, res) => {
  try {
    const { type, id } = req.params;
    let tableName;
    if (type === 'savings') tableName = 'savings';
    else if (type === 'loans') tableName = 'loans';
    else if (type === 'fines') tableName = 'fines';
    else return res.status(400).json({ error: "Invalid type" });

    if (useMongoDB) {
      let Model;
      if (type === 'savings') Model = Savings;
      else if (type === 'loans') Model = Loans;
      else if (type === 'fines') Model = Fines;
      await Model.findByIdAndDelete(id);
    } else {
      sqliteDB.run(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
    }
    res.json({ success: true, message: `${type.charAt(0).toUpperCase() + type.slice(1)} record deleted successfully!` });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/request-loan-pending", authenticateToken, async (req, res) => {
  try {
    const { member_code, amount, purpose, reason, due_date } = req.body;
    if (!member_code || !amount || !purpose) return res.status(400).json({ success: false, error: "Member code, amount and purpose required" });

    if (useMongoDB) {
      const transaction = await PendingTransaction.create({ member_code, amount, type: 'loan_request', proof_image: JSON.stringify({ purpose, reason, due_date }) });
      res.json({ success: true, message: "Loan request submitted for admin approval", id: transaction._id });
    } else {
      sqliteDB.run("INSERT INTO pending_transactions (member_code, amount, type, proof_image) VALUES (?, ?, 'loan_request', ?)", 
        [member_code, amount, JSON.stringify({ purpose, reason, due_date })], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Loan request submitted for admin approval", id: this.lastID });
      });
    }
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/repay-loan-pending", authenticateToken, async (req, res) => {
  try {
    const { member_code, loan_id, amount } = req.body;
    if (!member_code || !loan_id || !amount) return res.status(400).json({ success: false, error: "Member code, loan ID and amount required" });

    if (useMongoDB) {
      const transaction = await PendingTransaction.create({ member_code, amount, type: 'loan_repayment', proof_image: loan_id });
      res.json({ success: true, message: "Loan repayment submitted for admin approval", id: transaction._id });
    } else {
      sqliteDB.run("INSERT INTO pending_transactions (member_code, amount, type, proof_image) VALUES (?, ?, 'loan_repayment', ?)", [member_code, amount, loan_id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Loan repayment submitted for admin approval", id: this.lastID });
      });
    }
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/automation/status", async (req, res) => {
  try {
    let total_members, pending_loans;
    if (useMongoDB) {
      total_members = await Member.countDocuments();
      pending_loans = await Loans.countDocuments({ status: 'pending' });
    } else {
      total_members = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT COUNT(*) AS total FROM members", [], (err, row) => { if (err) reject(err); else resolve(row?.total || 0); });
      });
      pending_loans = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT COUNT(*) AS total FROM loans WHERE status = 'pending'", [], (err, row) => { if (err) reject(err); else resolve(row?.total || 0); });
      });
    }

    res.json({ success: true, status: "active", total_members, pending_loans, lastDailyRun: new Date().toISOString(), message: "System operational" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/automation/activities", async (req, res) => {
  try {
    let activities = [];
    if (useMongoDB) {
      const savingsActivities = await Savings.aggregate([{ $match: { date: { $gte: new Date(new Date().setHours(0,0,0,0)) } } }, { $project: { type: 'savings', description: 'Daily savings recorded', member_code: 1, amount: 1, timestamp: '$date' } }]);
      const loanActivities = await Loans.aggregate([{ $match: { due_date: { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) } } }, { $project: { type: 'loan', description: { $concat: ['Loan ', '$status'] }, member_code: 1, amount: 1, timestamp: '$due_date' } }]);
      activities = [...savingsActivities, ...loanActivities].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
    } else {
      activities = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT 'savings' as type, 'Daily savings recorded' as description, member_code, amount, date as timestamp FROM savings WHERE date(date) = date('now') UNION ALL SELECT 'loan' as type, 'Loan ' || status as description, member_code, amount, due_date as timestamp FROM loans WHERE date(due_date) >= date('now', '-7 days') ORDER BY timestamp DESC LIMIT 10", [], (err, rows) => {
          if (err) reject(err); else resolve(rows || []);
        });
      });
    }
    res.json(activities);
  } catch (error) { console.error("Activities error:", error); res.json([]); }
});

app.get("/api/real-data", async (req, res) => {
  try {
    let savings, fines;
    if (useMongoDB) {
      savings = await Savings.find(); fines = await Fines.find();
    } else {
      savings = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT * FROM savings", [], (err, rows) => { if (err) reject(err); else resolve(rows); });
      });
      fines = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT * FROM fines", [], (err, rows) => { if (err) reject(err); else resolve(rows); });
      });
    }
    res.json({ savings: savings || [], fines: fines || [], message: `Found ${savings?.length || 0} savings and ${fines?.length || 0} fines in database` });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/debug-all", async (req, res) => {
  try {
    let members, savings, fines, loans;
    if (useMongoDB) {
      members = await Member.find(); savings = await Savings.find(); fines = await Fines.find(); loans = await Loans.find();
    } else {
      members = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT * FROM members", [], (err, rows) => { if (err) reject(err); else resolve(rows); });
      });
      savings = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT * FROM savings", [], (err, rows) => { if (err) reject(err); else resolve(rows); });
      });
      fines = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT * FROM fines", [], (err, rows) => { if (err) reject(err); else resolve(rows); });
      });
      loans = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT * FROM loans", [], (err, rows) => { if (err) reject(err); else resolve(rows); });
      });
    }
    res.json({ members: members?.length || 0, savings: savings?.length || 0, fines: fines?.length || 0, loans: loans?.length || 0, message: "Total records in database" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/debug-hybrid", async (req, res) => {
  try {
    let members, testUser;
    if (useMongoDB) {
      members = await Member.find().limit(3); testUser = await Member.findOne({ username: "delaquez" });
    } else {
      members = await new Promise((resolve, reject) => {
        sqliteDB.all("SELECT * FROM members LIMIT 3", [], (err, rows) => { if (err) reject(err); else resolve(rows); });
      });
      testUser = await new Promise((resolve, reject) => {
        sqliteDB.get("SELECT * FROM members WHERE username = 'delaquez'", [], (err, row) => { if (err) reject(err); else resolve(row); });
      });
    }

    res.json({
      active_database: useMongoDB ? "MongoDB" : "SQLite", mongodb_connected: useMongoDB, total_members: members.length, test_user_exists: !!testUser,
      test_user: testUser ? { username: testUser.username, name: testUser.name, role: testUser.role } : null,
      sample_members: members.map(m => ({ username: m.username, name: m.name, role: m.role }))
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/", (req, res) => {
  res.json({ message: "Mercure Group API is running!", database: useMongoDB ? "MongoDB (Primary)" : "SQLite (Fallback)", status: "All systems operational" });
});

app.get("/api/debug-mongodb-uri", (req, res) => {
  const uri = process.env.MONGODB_URI;
  
  // Check what's actually in the environment variable
  res.json({
    has_mongodb_uri: !!uri,
    uri_length: uri ? uri.length : 0,
    starts_with_mongodb: uri ? uri.startsWith('mongodb') : false,
    is_srv_format: uri ? uri.includes('mongodb+srv') : false,
    has_database_name: uri ? uri.includes('.net/') : false,
    database_name: uri && uri.includes('.net/') ? uri.split('.net/')[1]?.split('?')[0] : 'NOT_FOUND',
    first_50_chars: uri ? uri.substring(0, 50) + '...' : 'NOT_SET',
    suggestion: "Your MONGODB_URI should be: mongodb+srv://delaquez:@Delaquez6@mercure-admin.wbbormv.mongodb.net/mercure_group?retryWrites=true&w=majority"
  });
});

connectToDatabases().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 API: http://localhost:${PORT}/api`);
    console.log(`🗄️  Database: ${useMongoDB ? "MongoDB" : "SQLite Fallback"}`);
    console.log(`🔐 Login: kevinbuxton2005@gmail.com / @Delaquez6`);
    console.log(`💡 Hybrid System: MongoDB for storage + SQLite for fallback`);
  });
});

