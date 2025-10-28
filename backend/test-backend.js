const fillTestCredentials = () => {
  setFormData({
    email: "delaquez@example.com",
    password: "pass123"
  });
  setAlert("👆 Test credentials filled!");
};
// Add this to your backend test file
const testConnection = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
};
