import cron from 'node-cron';
import Loan from './models/loanModel.js';
import Fine from './models/fineModels.js';
import Member from './models/member.js';
import { Saving } from './models/savingModel.js';

class AutomationEngine {
  constructor() {
    this.startAllJobs();
  }

  startAllJobs() {
    // Daily at 6:00 AM
    cron.schedule('0 6 * * *', () => {
      this.checkOverdueLoans();
      this.checkInactiveMembers();
      this.checkMissedSavings();
    });

    // Weekly on Monday at 8:00 AM
    cron.schedule('0 8 * * 1', () => {
      this.applyWeeklyPenalties();
      this.applyWeeklyInterest();
    });

    // Monthly on 1st at 9:00 AM
    cron.schedule('0 9 1 * *', () => {
      this.generateMonthlyReports();
      this.applyMonthlyInterest();
    });

    // Real-time event listeners
    this.setupRealTimeListeners();
  }

  async checkOverdueLoans() {
    const overdueLoans = await Loan.find({
      status: 'approved',
      dueDate: { $lt: new Date() },
      isOverdue: false
    });

    for (const loan of overdueLoans) {
      // Mark as overdue
      loan.isOverdue = true;
      await loan.save();

      // Auto-add penalty
      await Fine.create({
        memberId: loan.memberId,
        amount: 50,
        reason: `Late loan repayment - ${loan._id}`,
        type: 'auto-penalty'
      });

      console.log(`Auto-penalty added for loan ${loan._id}`);
    }
  }

  async applyWeeklyInterest() {
    const activeLoans = await Loan.find({
      status: 'approved',
      isOverdue: false
    });

    for (const loan of activeLoans) {
      const interest = loan.amount * 0.10; // 10% weekly interest
      loan.amount += interest;
      loan.interestApplied += interest;
      await loan.save();

      console.log(`10% interest applied to loan ${loan._id}`);
    }
  }

  async applyWeeklyPenalties() {
    const overdueLoans = await Loan.find({
      isOverdue: true,
      status: 'approved'
    });

    for (const loan of overdueLoans) {
      // Add Ksh 50 weekly penalty
      await Fine.create({
        memberId: loan.memberId,
        amount: 50,
        reason: `Weekly late penalty - Loan ${loan._id}`,
        type: 'auto-penalty'
      });

      console.log(`Weekly penalty added for loan ${loan._id}`);
    }
  }

  async checkInactiveMembers() {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const inactiveMembers = await Member.find({
      lastActivity: { $lt: ninetyDaysAgo },
      isActive: true
    });

    for (const member of inactiveMembers) {
      member.isActive = false;
      await member.save();

      // Auto-fine for inactivity
      await Fine.create({
        memberId: member._id,
        amount: 100,
        reason: 'Inactivity for 90+ days',
        type: 'auto-inactivity'
      });

      console.log(`Member ${member._id} flagged as inactive`);
    }
  }

  async checkMissedSavings() {
    const members = await Member.find({ isActive: true });
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Check if it's a meeting day (example: Tuesday = 2)
    if (today === 2) {
      for (const member of members) {
        const lastSaving = await Saving.findOne({
          memberId: member._id
        }).sort({ date: -1 });

        const daysSinceLastSave = lastSaving ? 
          (new Date() - new Date(lastSaving.date)) / (1000 * 60 * 60 * 24) : 999;

        if (daysSinceLastSave > 7) { // No savings in 7 days
          await Fine.create({
            memberId: member._id,
            amount: 50,
            reason: 'Missed weekly savings contribution',
            type: 'auto-missed-saving'
          });
        }
      }
    }
  }

  setupRealTimeListeners() {
    // Real-time event listeners for instant automation
    Loan.watch().on('change', (change) => {
      if (change.operationType === 'insert') {
        this.handleNewLoan(change.fullDocument);
      }
    });

    Saving.watch().on('change', (change) => {
      if (change.operationType === 'insert') {
        this.updateMemberActivity(change.fullDocument.memberId);
      }
    });
  }

  async handleNewLoan(loan) {
    // Auto-calculate due date (30 days from approval)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    
    await Loan.findByIdAndUpdate(loan._id, {
      dueDate: dueDate,
      interestApplied: 0
    });
  }

  async updateMemberActivity(memberId) {
    await Member.findByIdAndUpdate(memberId, {
      lastActivity: new Date(),
      isActive: true
    });
  }

  async generateMonthlyReports() {
    // Auto-generate monthly financial reports
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    
    const report = {
      month,
      year,
      totalSavings: await Saving.aggregate([...any]),
      totalLoans: await Loan.aggregate([...any]),
      totalFines: await Fine.aggregate([...any]),
      generatedAt: new Date()
    };

    // Save report to database or send via email
    console.log('Monthly report generated:', report);
  }
}


export default AutomationEngine;


