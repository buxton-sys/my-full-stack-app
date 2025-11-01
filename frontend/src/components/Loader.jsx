// Auto-refresh every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    fetchLoans(); // or fetchSavings(), fetchFines()
  }, 30000);
  return () => clearInterval(interval);
}, []);

// Calculate these automatically instead of manually:
const autoStats = {
  overdueLoans: loans.filter(l => 
    l.status === 'approved' && 
    new Date(l.dueDate) < new Date()
  ).length,
  
  potentialFines: members.filter(m => 
    m.lastActive && 
    new Date() - new Date(m.lastActive) > 90 * 24 * 60 * 60 * 1000
  ).length
};
