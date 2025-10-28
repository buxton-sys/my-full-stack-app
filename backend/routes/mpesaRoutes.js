const express = require('express');
const router = express.Router();
const db = require('../database');

// M-PESA STK Push callback URL
router.post('/callback', async (req, res) => {
  try {
    console.log('📞 M-PESA Callback received:', JSON.stringify(req.body, null, 2));

    const callbackData = req.body;
    
    if (!callbackData.Body?.stkCallback) {
      return res.status(400).json({
        ResultCode: 1,
        ResultDesc: "Invalid callback format"
      });
    }

    const stkCallback = callbackData.Body.stkCallback;
    const checkoutRequestID = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    console.log(`🔄 Processing STK Callback: ${checkoutRequestID}`);
    console.log(`   Result: ${resultCode} - ${resultDesc}`);

    if (resultCode === 0) {
      await handleSuccessfulPayment(stkCallback, checkoutRequestID);
    } else {
      await handleFailedPayment(stkCallback, checkoutRequestID, resultCode, resultDesc);
    }

    res.json({
      ResultCode: 0,
      ResultDesc: "Success"
    });
  } catch (error) {
    console.error('❌ Callback processing error:', error);
    res.status(500).json({
      ResultCode: 1,
      ResultDesc: "Internal server error"
    });
  }
});

// Handle successful payment
async function handleSuccessfulPayment(stkCallback, checkoutRequestID) {
  try {
    const callbackMetadata = stkCallback.CallbackMetadata;
    const metadataItems = callbackMetadata.Item;

    let amount, mpesaReceiptNumber, phoneNumber, transactionDate;

    metadataItems.forEach(item => {
      if (item.Name === 'Amount') amount = item.Value;
      if (item.Name === 'MpesaReceiptNumber') mpesaReceiptNumber = item.Value;
      if (item.Name === 'PhoneNumber') phoneNumber = item.Value;
      if (item.Name === 'TransactionDate') transactionDate = item.Value;
    });

    console.log(`✅ PAYMENT SUCCESSFUL:`);
    console.log(`   Amount: ${amount}`);
    console.log(`   Receipt: ${mpesaReceiptNumber}`);
    console.log(`   Phone: ${phoneNumber}`);
    console.log(`   Date: ${transactionDate}`);

    const stkRequest = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM stk_requests WHERE checkout_request_id = ?`,
        [checkoutRequestID],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!stkRequest) {
      throw new Error('STK request not found');
    }

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE stk_requests SET status = 'completed', mpesa_reference = ?, result_code = '0', result_desc = 'Success', completed_at = ? WHERE checkout_request_id = ?`,
        [mpesaReceiptNumber, new Date().toISOString(), checkoutRequestID],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO savings (member_id, amount, date) VALUES (?, ?, ?)`,
        [stkRequest.member_id, amount, new Date().toISOString()],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    const member = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM members WHERE id = ?`,
        [stkRequest.member_id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (member) {
      try {
        const smsService = require('../services/smsService');
        await smsService.sendPaymentConfirmation(
          member.phone,
          member.name,
          amount,
          stkRequest.payment_type,
          amount
        );

        const emailService = require('../services/emailService');
        await emailService.sendPaymentConfirmation(
          member,
          amount,
          stkRequest.payment_type,
          amount
        );
      } catch (notificationError) {
        console.error('❌ Notification error:', notificationError);
      }
    }

    console.log(`💰 Payment processing completed for member ${stkRequest.member_id}`);
  } catch (error) {
    console.error('❌ Error processing successful payment:', error);
    throw error;
  }
}

// Handle failed payment
async function handleFailedPayment(stkCallback, checkoutRequestID, resultCode, resultDesc) {
  try {
    console.log(`❌ PAYMENT FAILED: ${resultDesc}`);

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE stk_requests SET status = 'failed', result_code = ?, result_desc = ? WHERE checkout_request_id = ?`,
        [resultCode, resultDesc, checkoutRequestID],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    console.log(`📝 STK request marked as failed: ${checkoutRequestID}`);
  } catch (error) {
    console.error('❌ Error processing failed payment:', error);
    throw error;
  }
}

module.exports = router;
