const cron = require('node-cron');
const db = require('../database');

class AutomatedReminders {
  constructor() {
    this.lastDailyRun = null;
    this.lastEveningRun = null;
    this.nextDailyRun = new Date();
    this.nextDailyRun.setHours(8, 0, 0, 0);
    if (this.nextDailyRun < new Date()) {
      this.nextDailyRun.setDate(this.nextDailyRun.getDate() + 1);
    }
    
    this.startScheduledJobs();
  }

  startScheduledJobs() {
    console.log('🤖 Starting automated STK PUSH system...');

    // Daily at 8:00 AM - Morning STK PUSH PROMPTS
    cron.schedule('0 8 * * *', () => {
      console.log('🕗 Running 8:00 AM STK PUSH PROMPTS...');
      this.sendSTKPushPrompts('morning');
      this.lastDailyRun = new Date();
    });

    // Daily at 8:00 PM - Evening STK PUSH PROMPTS
    cron.schedule('0 20 * * *', () => {
      console.log('🕗 Running 8:00 PM STK PUSH PROMPTS...');
      this.sendSTKPushPrompts('evening');
      this.lastEveningRun = new Date();
    });

    console.log('✅ Automated STK Push prompts scheduled:');
    console.log('   - 8:00 AM: Morning STK Push (Ksh 30 savings)');
    console.log('   - 8:00 PM: Evening STK Push (Ksh 30 savings)');
  }

  async sendSTKPushPrompts(timeOfDay) {
    try {
      console.log(`📱 SIMULATING ${timeOfDay} STK PUSH PROMPTS...`);
      
      db.all("SELECT * FROM members WHERE status = 'approved'", async (err, members) => {
        if (err) {
          console.error('❌ Error fetching members:', err);
          return;
        }

        console.log(`📋 Found ${members.length} active members for ${timeOfDay} STK prompts`);

        for (const member of members) {
          try {
            // Check if member has paid TODAY
            const today = new Date().toISOString().split('T')[0];
            db.get(
              `SELECT COUNT(*) as count FROM savings WHERE member_id = ? AND date(date) = ?`,
              [member.id, today],
              async (err, row) => {
                if (err) {
                  console.error(`❌ Error checking payments for ${member.name}:`, err);
                  return;
                }

                if (row.count === 0) {
                  // Member hasn't paid TODAY - simulate STK PUSH PROMPT
                  console.log(`🎯 SIMULATING STK PUSH to ${member.name} (${member.phone}) - Ksh 30`);
                  
                  // Simulate successful STK Push
                  const stkResult = {
                    success: true,
                    checkoutRequestID: 'SIM_' + Date.now() + '_' + member.id,
                    simulated: true,
                    message: 'STK Push simulated - user would see M-PESA prompt'
                  };

                  if (stkResult.success) {
                    // Create pending STK payment record
                    db.run(
                      `INSERT INTO stk_requests (member_id, amount, phone_number, checkout_request_id, description, prompt_time, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
                      [member.id, 30, member.phone, stkResult.checkoutRequestID, `${timeOfDay} savings`, timeOfDay, new Date().toISOString()],
                      function(err) {
                        if (err) {
                          console.error('❌ Error creating STK request:', err);
                        } else {
                          console.log(`✅ STK request recorded for ${member.name}`);
                        }
                      }
                    );

                    // Log this automation
                    db.run(
                      `INSERT INTO automation_logs (member_id, action_type, description, created_at) VALUES (?, ?, ?, ?)`,
                      [member.id, `${timeOfDay}_stk_push`, `Sent ${timeOfDay} Ksh 30 STK Push`, new Date().toISOString()]
                    );
                  }
                } else {
                  console.log(`✅ ${member.name} already paid today - skipping STK push`);
                }
              }
            );
          } catch (memberError) {
            console.error(`❌ Error processing member ${member.id}:`, memberError);
          }
        }
      });
    } catch (error) {
      console.error(`❌ Error in ${timeOfDay} STK prompts:`, error);
    }
  }

  // MANUAL STK PUSH PROMPTS - ONLY FOR AMOUNTS OTHER THAN Ksh 30
  async sendManualSTKPrompt(userPhones, amount, paymentType, description) {
    try {
      // VALIDATION: Manual prompts should NOT be for Ksh 30 savings
      if (amount === 30 && paymentType === 'savings') {
        return { 
          success: false, 
          error: 'Ksh 30 savings prompts are automated. Manual prompts are for other amounts only.' 
        };
      }

      console.log(`👑 Super Admin MANUAL STK PUSH: Ksh ${amount} for ${paymentType} to ${userPhones.length} users`);
      
      const placeholders = userPhones.map(() => '?').join(',');
      const query = `SELECT * FROM members WHERE phone IN (${placeholders})`;
      
      return new Promise((resolve, reject) => {
        db.all(query, userPhones, async (err, members) => {
          if (err) {
            console.error('❌ Error fetching members for manual STK:', err);
            resolve({ success: false, error: err.message });
            return;
          }

          const results = [];
          for (const member of members) {
            try {
              console.log(`📱 SIMULATING MANUAL STK PUSH to ${member.name} (${member.phone}) - Ksh ${amount}`);
              
              // Simulate STK Push prompt
              const stkResult = {
                success: true,
                checkoutRequestID: 'MANUAL_' + Date.now() + '_' + member.id,
                simulated: true,
                message: 'Manual STK Push simulated'
              };

              if (stkResult.success) {
                // Create manual STK request
                db.run(
                  `INSERT INTO stk_requests (member_id, amount, phone_number, checkout_request_id, description, payment_type, prompt_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'manual', 'pending', ?)`,
                  [member.id, amount, member.phone, stkResult.checkoutRequestID, description, paymentType, new Date().toISOString()],
                  function(err) {
                    if (err) {
                      console.error('❌ Error creating manual STK request:', err);
                    }
                  }
                );
              }

              results.push({
                member: member.name,
                phone: member.phone,
                amount: amount,
                type: paymentType,
                status: stkResult.success ? 'success' : 'failed',
                checkoutRequestID: stkResult.checkoutRequestID,
                error: stkResult.error
              });

              console.log(`✅ Manual STK push simulated for ${member.name}`);
            } catch (memberError) {
              console.error(`❌ Error sending manual STK to ${member.name}:`, memberError);
              results.push({
                member: member.name,
                phone: member.phone,
                amount: amount,
                type: paymentType,
                status: 'failed',
                error: memberError.message
              });
            }
          }

          const successCount = results.filter(r => r.status === 'success').length;
          console.log(`🎯 Manual STK pushes completed: ${successCount} successful`);
          resolve({ success: true, results });
        });
      });
    } catch (error) {
      console.error('❌ Error in manual STK prompts:', error);
      return { success: false, error: error.message };
    }
  }

  // Get automation status
  getStatus() {
    return {
      status: 'running',
      lastDailyRun: this.lastDailyRun,
      lastEveningRun: this.lastEveningRun,
      nextDailyRun: this.nextDailyRun,
      nextDailyRunFormatted: this.nextDailyRun.toLocaleString(),
      description: 'Automated Ksh 30 payment prompts at 8AM & 8PM'
    };
  }
}

module.exports = AutomatedReminders;