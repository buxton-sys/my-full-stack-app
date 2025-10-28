const axios = require('axios');

class SMSService {
  constructor() {
    this.apiKey = process.env.AFRICAS_TALKING_API_KEY;
    this.username = process.env.AFRICAS_TALKING_USERNAME;
  }

  // Send payment confirmation SMS (after STK Push is completed)
  async sendPaymentConfirmation(phoneNumber, userName, amount, paymentType, newBalance) {
    const message = `Dear ${userName}, payment of Ksh ${amount} for ${paymentType} received successfully! Your new balance: Ksh ${newBalance}. Thank you! 🌟`;
    
    return await this.sendSMS(phoneNumber, message);
  }

  // Send reminder for failed/late payments (not payment prompts)
  async sendReminder(phoneNumber, userName, amount, paymentType, daysLate = 0) {
    const urgency = daysLate > 7 ? 'URGENT: ' : '';
    const message = `${urgency}Reminder ${userName}! Please check for pending M-PESA prompt for Ksh ${amount} (${paymentType}). Thank you! 💪`;
    
    return await this.sendSMS(phoneNumber, message);
  }

  // Generic SMS method
  async sendSMS(phoneNumber, message) {
    try {
      console.log(`📱 SIMULATED SMS to ${phoneNumber}: ${message}`);
      
      // UNCOMMENT FOR AFRICA'S TALKING:
      /*
      const response = await axios.post(
        'https://api.africastalking.com/version1/messaging',
        {
          username: this.username,
          to: phoneNumber,
          message: message,
          from: 'MERCURE'
        },
        {
          headers: {
            'ApiKey': this.apiKey,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      */
      
      return { success: true, message: 'SMS sent successfully' };
    } catch (error) {
      console.error('❌ SMS sending failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SMSService();
