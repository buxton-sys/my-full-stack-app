// simple mock API using localStorage
const KEY = "mercure_mock_v1";

function load() {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    // initial seed
    const init = {
      members: [
        { id: 1, name: "Delaquez", username: "delaquez", phone: "712345678", email: "delaquez@example.com", role: "Treasurer", idNumber: "123456789" },
        { id: 2, name: "Hemston", username: "hemston", phone: "700000001", email: "hemston@example.com", role: "Member", idNumber: "222222222" },
      ],
      savings: [
        { id: 1, member_id: 1, amount: 12500, date: Date.now() },
        { id: 2, member_id: 2, amount: 5000, date: Date.now() },
      ],
      loans: [
        // sample loan
        // { id:1, member_id:2, amount:10000, principal_amount:10000, interest:1000, late_penalty:0, status:'pending', due_date: null, purpose:'emergency'}
      ],
      fines: [],
      announcements: [],
      transactions: [],
      lastId: { members: 2, savings: 2, loans: 0, fines: 0, announcements: 0, transactions: 0 }
    };
    localStorage.setItem(KEY, JSON.stringify(init));
    return init;
  }
  return JSON.parse(raw);
}

function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function genId(state, table) {
  state.lastId[table] = (state.lastId[table] || 0) + 1;
  return state.lastId[table];
}

function delay(t = 100) {
  return new Promise((res) => setTimeout(res, t));
}

export const api = {
  // MEMBERS
  async getMembers() {
    const s = load();
    await delay();
    return s.members.slice().sort((a,b)=>a.id-b.id);
  },
  async addMember(payload) {
    const s = load();
    await delay();
    const id = genId(s, "members");
    const member = { id, ...payload };
    s.members.push(member);
    save(s);
    return member;
  },
  async updateMember(id, payload) {
    const s = load();
    await delay();
    const idx = s.members.findIndex(m=>m.id===id);
    if (idx === -1) throw new Error("Member not found");
    s.members[idx] = { ...s.members[idx], ...payload };
    save(s);
    return s.members[idx];
  },
  async deleteMember(id) {
    const s = load();
    await delay();
    s.members = s.members.filter(m=>m.id!==id);
    save(s);
    return true;
  },

  // SAVINGS
  async getSavings() {
    const s = load(); await delay();
    return s.savings.slice().sort((a,b)=>b.date-a.date);
  },
  async addSaving({ member_id, amount }) {
    const s = load(); await delay();
    const id = genId(s, "savings");
    const rec = { id, member_id, amount, date: Date.now() };
    s.savings.push(rec);
    s.transactions.push({ id: genId(s,"transactions"), member_id, type: "deposit", amount, date: Date.now() });
    save(s);
    return rec;
  },
  async getTotalSavings() {
    const s = load();
    await delay();
    return s.savings.reduce((sum, r) => sum + Number(r.amount), 0);
  },

  // LOANS
  async getLoans() {
    const s = load(); await delay();
    return s.loans.slice().sort((a,b)=>b.id-a.id);
  },
  async requestLoan(payload) {
    const s = load(); await delay();
    const id = genId(s,"loans");
    const loan = {
      id,
      member_id: payload.member_id,
      amount: Number(payload.amount),
      principal_amount: Number(payload.amount),
      interest: 0,
      late_penalty: 0,
      purpose: payload.purpose || "other",
      reason: payload.reason || "",
      status: "pending",
      due_date: payload.due_date || null
    };
    s.loans.push(loan);
    save(s);
    return loan;
  },
  async repayLoan(loan_id, payment_amount) {
    const s = load(); await delay();
    const loan = s.loans.find(l=>l.id===loan_id);
    if(!loan) throw new Error("Loan not found");
    // simple interest 10% on principal
    const interest = loan.principal_amount * 0.1;
    const total = loan.amount + interest + (loan.late_penalty || 0);
    let remaining = total - payment_amount;
    if (remaining <= 0) {
      loan.amount = 0;
      loan.status = "paid";
      loan.interest = interest;
    } else {
      // Store remaining as loan.amount for simplicity
      loan.amount = remaining;
      loan.interest = interest;
    }
    save(s);
    return loan;
  },

  // FINES
  async addFine({ member_id, amount, reason }) {
    const s = load(); await delay();
    const id = genId(s,"fines");
    const fine = { id, member_id, amount, reason, paid: false, date: Date.now() };
    s.fines.push(fine); save(s); return fine;
  },
  async getFines() { const s = load(); await delay(); return s.fines.slice().sort((a,b)=>b.id-a.id); },
  async payFine(id) { const s = load(); await delay(); const f = s.fines.find(x=>x.id===id); if(f) f.paid=true; save(s); return f; },

  // ANNOUNCEMENTS
  async postAnnouncement({ title, message }) {
    const s = load(); await delay();
    const id = genId(s,"announcements");
    const a = { id, title, message, created_at: Date.now() };
    s.announcements.push(a); save(s); return a;
  },
  async getAnnouncements() { const s = load(); await delay(); return s.announcements.slice().sort((a,b)=>b.id-a.id); },

  // simple auth (mock)
  async login({ email, password }) {
  const s = load();
  await delay();
  const member = s.members.find(m => m.email === email);
  if (!member) throw new Error("Member not found");
  if (password !== "pass123") throw new Error("Invalid password");
  return {
    data: {
      success: true,
      token: "mock-token",
      role: member.role,
      user: member
    }
  };
}
};
export const login = async (credentials) => {
  return await api.login(credentials);
};

