const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // For now, we'll simulate email sending. Configure with your email service later
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // Replace with your email service
      auth: {
        user: process.env.EMAIL_USER || 'your_email@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'your_app_password'
      }
    });
  }

  async sendProgressReport(user) {
    const subject = "📊 Your Daily Progress Report - Mercure System";
    const html = this.generateProgressHTML(user);

    try {
      console.log(`📧 SIMULATED EMAIL to ${user.email}: ${subject}`);
      
      // UNCOMMENT THIS WHEN YOU HAVE EMAIL CREDENTIALS:
      /*
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: subject,
        html: html
      });
      */
      
      console.log(`✅ Progress email sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPaymentConfirmation(user, amount, paymentType, newBalance) {
    const subject = "✅ Payment Received - Thank You!";
    const html = this.generatePaymentConfirmationHTML(user, amount, paymentType, newBalance);

    try {
      console.log(`📧 SIMULATED PAYMENT CONFIRMATION to ${user.email}`);
      
      // UNCOMMENT WHEN READY:
      /*
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: subject,
        html: html
      });
      */
      
      console.log(`✅ Payment confirmation email sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  generateProgressHTML(user) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
          .container { max-width: 600px; background: white; border-radius: 15px; padding: 30px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #7C3AED, #06B6D4); color: white; padding: 20px; border-radius: 10px; text-align: center; }
          .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .stat-card { background: #f8fafc; padding: 15px; border-radius: 10px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Your Daily Progress</h1>
            <p>Hello ${user.name}, here's your financial progress!</p>
          </div>
          
          <div class="stats">
            <div class="stat-card">
              <h3>💰 Savings Balance</h3>
              <p style="font-size: 24px; font-weight: bold; color: #10B981;">Ksh ${user.balance || 0}</p>
            </div>
            <div class="stat-card">
              <h3>📈 Total Contributions</h3>
              <p style="font-size: 24px; font-weight: bold; color: #06B6D4;">Ksh ${user.total_savings || 0}</p>
            </div>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <p style="font-size: 18px; color: #7C3AED; font-weight: bold;">
              "Small daily improvements are the key to staggering long-term results." 🌟
            </p>
          </div>

          <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; border-left: 4px solid #06B6D4;">
            <h3 style="color: #06B6D4; margin-top: 0;">💡 Today's Tip</h3>
            <p>Consistent Ksh 30 daily savings = Ksh 10,950 yearly! Keep going! 🚀</p>
          </div>

          <div style="text-align: center; margin-top: 25px; color: #666;">
            <p>Thank you for being part of our Mercure community! 💜</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generatePaymentConfirmationHTML(user, amount, paymentType, newBalance) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
          .container { max-width: 600px; background: white; border-radius: 15px; padding: 30px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #10B981, #06B6D4); color: white; padding: 20px; border-radius: 10px; text-align: center; }
          .success-icon { font-size: 48px; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">✅</div>
            <h1>Payment Received!</h1>
            <p>Thank you for your contribution</p>
          </div>
          
          <div style="text-align: center; padding: 25px;">
            <h2 style="color: #10B981; font-size: 36px; margin: 0;">Ksh ${amount}</h2>
            <p style="color: #666; font-size: 18px;">${paymentType} Payment</p>
          </div>

          <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #06B6D4; margin-top: 0;">📈 Your New Balance</h3>
            <p style="font-size: 24px; font-weight: bold; color: #7C3AED;">Ksh ${newBalance}</p>
          </div>

          <div style="text-align: center; color: #666;">
            <p>Your commitment is building a better future! 🌟</p>
            <p><strong>Next payment reminder:</strong> Tomorrow at 8:00 AM</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();