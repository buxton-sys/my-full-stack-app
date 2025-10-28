import mongoose from "mongoose";


const memberSchema = new mongoose.Schema({
  // Personal Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    required: true
  },
  idNumber: {
    type: String,
    required: true,
    unique: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },

  // Account Information
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['chairperson', 'deputy-secretary', 'secretary', 'treasurer', 'organizer', 'head-of-security', 'editor-publisher', 'member', 'guest'],
    default: 'guest'
  },
  
  // Approval System
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member'
  },
  approvedAt: Date,
  
  // Financial Information
  totalSavings: {
    type: Number,
    default: 0
  },
  totalLoans: {
    type: Number,
    default: 0
  },
  totalFines: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  score: { type: Number, default: 0 }
});

// Update the updatedAt field before saving
memberSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Hash password before saving
memberSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
memberSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('Member', memberSchema);

// ------------------ AUTH ------------------
export const login = async (credentials) => {
    return await axios.post(`${BASE_URL}/login`, credentials
    );
};
// ------------------ ANNOUNCEMENTS ------------------
export const addAnnouncement = async (announcementData) => {
    return await axios.post(`${BASE_URL}/add-announcement`, announcementData);
};
export const getAnnouncements = async () => {
    const res = await axios.get(`${BASE_URL}/get-announcements`);
    const data = ensureArray(res?.data);
    return { ...res, data };
};

// ------------------ MEMBERS ------------------
export const getPendingMembers = async () => {
    const res = await axios.get(`${BASE_URL}/get-pending-members`);
    const data = ensureArray(res?.data);
    return { ...res, data };
};
export const approveMember = async (id) => {
    return await axios.post(`${BASE_URL}/approve-member/${id}`);
};
export const getMember = async (id) => {
    return await axios.get(`${BASE_URL}/get-member/${id}`);
};
export const getMembers = async () => {
    const res = await axios.get(`${BASE_URL}/get-members`);
    // normalize to an array in res.data
    const data = ensureArray(res?.data);
    return { ...res, data };
}
export const addMember = async (memberData) => {
    return await axios.post(`${BASE_URL}/add-member`, memberData);
};
export const updateMember = async (memberData) => {
    return await axios.put(`${BASE_URL}/update-member`, memberData);
};
export const deleteMember = async (id) => {
    return await axios.delete(`${BASE_URL}/delete-member/${id}`);
};
// ------------------ SAVINGS ------------------
export const getSavings = async () => {
    const res = await axios.get(`${BASE_URL}/get-savings`);
    const normalized = normalizeSavingsPayload(res?.data);
    return { ...res, data: normalized };
};
export const getTotalSavings = async () => {
    return await axios.get(`${BASE_URL}/get-total-savings`);
};
export const addSaving = async (savingData) => {
    return await axios.post(`${BASE_URL}/add-saving`, savingData);
};
// Afterschool
export const getAfterschool = async () => {
    const res = await axios.get(`${BASE_URL}/get-afterschool`);
    const data = ensureArray(res?.data);
    return { ...res, data };
};

export const payAfterschool = async (paymentData) => {
    return await axios.post(`${BASE_URL}/pay-afterschool`, paymentData);
};

export const addAfterschool = async (afterschoolData) => {
    return await axios.post(`${BASE_URL}/add-afterschool`, afterschoolData);
};
// ------------------ LOANS ------------------ 
export const getLoans = async () => {
    const res = await axios.get(`${BASE_URL}/get-loans`);
    const data = ensureArray(res?.data);
    return { ...res, data };
};
export const addLoan = async (loanData) => {
    return await axios.post(`${BASE_URL}/add-loan`, loanData);
};
// ------------------ FINES ------------------
export const getFines = async () => {
  
    const res = await axios.get(`${BASE_URL}/get-fines`);
    const data = ensureArray(res?.data);
    return { ...res, data };
};
export const addFine = async (fineData) => {
    return await axios.post(`${BASE_URL}/add-fine`, fineData);

}
// Utility function to ensure data is always an array
const ensureArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data == null) return [];
    return [data];
};

// Utility function to normalize savings payload
const normalizeSavingsPayload = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return [data];
};
// ------------------ FINANCIAL SUMMARY ------------------
export const getFinancialSummary = async () => {
    return await axios.get(`${BASE_URL}/financial-summary`);
};
// ------------------ REGISTRATION ------------------
export const register = async (userData) => {
    return await axios.post(`${BASE_URL}/register`, userData);
};