const axios = require('axios');
const crypto = require('crypto');

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY || 'your_consumer_key';
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || 'your_consumer_secret';
    this.businessShortCode = process.env.MPESA_BUSINESS_SHORTCODE || '174379'; // Till number or Paybill
    this.passkey = process.env.MPESA_PASSKEY || 'your_passkey';
    this.callbackURL = process.env.MPESA_CALLBACK_URL || 'https://yourdomain.com/api/mpesa/callback';
    
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get access token from Safaricom
  async getAccessToken() {
    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      
      const response = await axios.get(
        'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (3500 * 1000); // Token expires in ~1 hour
      
      console.log('✅ M-PESA access token obtained');
      return this.accessToken;
    } catch (error) {
      console.error('❌ M-PESA token error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Send STK Push (PROMPT) to user's phone
  async sendSTKPush(phoneNumber, amount, accountReference, transactionDesc) {
    try {
      // Ensure we have valid token
      if (!this.accessToken || Date.now() >= this.tokenExpiry) {
        await this.getAccessToken();
      }

      // Format phone number (2547...)
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      // Generate timestamp
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, -4);
      
      // Generate password
      const password = Buffer.from(`${this.businessShortCode}${this.passkey}${timestamp}`).toString('base64');

      const requestData = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline', // or 'CustomerBuyGoodsOnline' for till
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: this.businessShortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackURL,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc
      };

      console.log(`📱 SENDING STK PUSH to ${formattedPhone} for Ksh ${amount}`);

      const response = await axios.post(
        'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
        requestData,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ STK Push sent successfully:', response.data);
      return {
        success: true,
        checkoutRequestID: response.data.CheckoutRequestID,
        response: response.data
      };

    } catch (error) {
      console.error('❌ STK Push error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Format phone number to 2547...
  formatPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    } else if (cleaned.startsWith('7') && cleaned.length === 9) {
      cleaned = '254' + cleaned;
    }
    
    return cleaned;
  }

  // Simulate STK Push for testing (remove when going live)
  async simulateSTKPush(phoneNumber, amount, accountReference, transactionDesc) {
    console.log(`🎯 SIMULATED STK PUSH to ${phoneNumber}:`);
    console.log(`   Amount: Ksh ${amount}`);
    console.log(`   Account: ${accountReference}`);
    console.log(`   Description: ${transactionDesc}`);
    console.log(`   📲 User would see M-PESA prompt to enter PIN`);

    // Simulate successful response
    return {
      success: true,
      checkoutRequestID: 'SIM_' + Date.now(),
      simulated: true,
      message: 'STK Push simulated - user will see M-PESA prompt'
    };
  }
}

module.exports = new MpesaService();