const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const db = new sqlite3.Database("./mercure.db", (err) => {
  if (err) return console.error("❌ DB connection error:", err.message);
  console.log("✅ DB connected for seeding");
});

async function seed() {
  try {
    // Delete existing data (optional)
    await db.run("DELETE FROM members");
    await db.run("DELETE FROM savings");
    await db.run("DELETE FROM loans");
    await db.run("DELETE FROM fines");

    // --- Members ---
    const members = [
      { name: "Hmeston Odege", username: "Hemston", email: "hemston@test.com", phone: "0708692752", password: "pass123", role: "Chairperson", balance: 3500 },
      { name: "Bob", username: "bob", email: "bob@test.com", phone: "0711000002", password: "pass123", role: "Member", balance: 8000 },
      { name: "Charlie", username: "charlie", email: "charlie@test.com", phone: "0711000003", password: "pass123", role: "Admin", balance: 10000 },
      { name: "Diana", username: "diana", email: "diana@test.com", phone: "0711000004", password: "pass123", role: "Super Admin", balance: 15000 },
      { name: "Eve", username: "eve", email: "eve@test.com", phone: "0711000005", password: "pass123", role: "Financial Admin", balance: 12000 },
    ];

    for (let m of members) {
      const hash = await bcrypt.hash(m.password, 10);
      await db.run(
        "INSERT INTO members (name, username, email, phone, password, role, balance, last_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [m.name, m.username, m.email, m.phone, hash, m.role, m.balance, new Date().toISOString()]
      );
    }
    console.log("✅ Members seeded");

    // --- Savings ---
    const savings = [
      { member_id: 1, amount: 2000 },
      { member_id: 2, amount: 3000 },
      { member_id: 3, amount: 5000 },
      { member_id: 4, amount: 7000 },
      { member_id: 5, amount: 4000 },
    ];

    for (let s of savings) {
      await db.run("INSERT INTO savings (member_id, amount) VALUES (?, ?)", [s.member_id, s.amount]);
    }
    console.log("✅ Savings seeded");

    // --- Loans ---
    const loans = [
      { member_id: 1, amount: 1000, purpose: "Emergency", reason: "Medical", status: "pending", due_date: "2025-11-15" },
      { member_id: 2, amount: 2000, purpose: "Business", reason: "Stock", status: "paid", due_date: "2025-09-01" },
      { member_id: 3, amount: 1500, purpose: "Education", reason: "Books", status: "pending", due_date: "2025-10-30" },
    ];

    for (let l of loans) {
      await db.run(
        "INSERT INTO loans (member_id, amount, principal_amount, purpose, reason, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [l.member_id, l.amount, l.amount, l.purpose, l.reason, l.status, l.due_date]
      );
    }
    console.log("✅ Loans seeded");

    // --- Fines ---
    const fines = [
      { member_id: 1, amount: 100, reason: "Late payment" },
      { member_id: 2, amount: 50, reason: "Missed meeting" },
      { member_id: 3, amount: 150, reason: "Late loan repayment" },
    ];

    for (let f of fines) {
      await db.run("INSERT INTO fines (member_id, amount, reason) VALUES (?, ?, ?)", [f.member_id, f.amount, f.reason]);
    }
    console.log("✅ Fines seeded");

    console.log("🎉 Seeding complete! You can now test login, members, savings, loans, fines, and inactive flags.");
    db.close();
  } catch (err) {
    console.error("❌ Seeding error:", err);
  }
}

seed();

