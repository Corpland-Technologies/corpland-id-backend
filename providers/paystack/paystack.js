const mongoose = require("mongoose");
const { config } = require("../../core/config");
const {
  TransactionMessages,
} = require("../../files/transaction/transaction.messages");
const {
  TransactionRepository,
} = require("../../files/transaction/transaction.repository");

const RequestHandler = require("../../utils/axios.provision");
const { providerMessages } = require("../providers.messages");
const {
  NotificationRepository,
} = require("../../files/notifications/notification.repository");

const {
  SubscriberRepository,
} = require("../../files/subscriber/subscriber.repository");

class PaystackPaymentService {
  paymentRequestHandler = RequestHandler.setup({
    baseURL: config.PAYSTACK_URL,
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${config.PAYSTACK_KEY}`,
      "Accept-Encoding": "gzip,deflate,compress",
    },
  });

  checkSuccessStatus(status, gatewayResponse) {
    if (status === "success")
      return { success: true, message: gatewayResponse };

    return { success: false, message: gatewayResponse };
  }

  async verifySuccessOfPayment(payload) {
    const statusVerification = this.checkSuccessStatus(
      payload.status,
      payload.gateway_response
    );

    let responseStatus = "pending";
    if (statusVerification.success) {
      responseStatus = "confirmed";
    } else {
      responseStatus = "failed";
    }

    const updatedExisting =
      await TransactionRepository.updateTransactionDetails(
        { reference: payload.reference },
        { status: responseStatus, metaData: JSON.stringify(payload) }
      );

    if (!updatedExisting)
      return { success: false, message: TransactionMessages.PAYMENT_FAILURE };

    return {
      success: statusVerification.success,
      message: statusVerification.message,
    };
  }

  async initiatePayment(paymentPayload) {
    const { email, amount, callbackUrl } = paymentPayload;

    const paystackResponse = await this.paymentRequestHandler({
      method: "POST",
      url: "/transaction/initialize",
      data: {
        amount: amount,
        email,
        callback_url: callbackUrl,
      },
    });

    if (!paystackResponse.status)
      return {
        success: false,
        message: providerMessages.INITIATE_PAYMENT_FAILURE,
      };

    const paystackData = paystackResponse.data.data;

    const response = {
      authorizationUrl: paystackData.authorization_url,
      accessCode: paystackData.access_code,
      reference: paystackData.reference,
      callback: callbackUrl
        ? `${callbackUrl}?reference=${paystackData.reference}`
        : null,
    };

    return {
      success: true,
      message: providerMessages.INITIATE_PAYMENT_SUCCESS,
      data: response,
    };
  }

  async verifyCardPayment(payload) {
    //check success of transaction
    const { data } = payload;
    const transaction = await TransactionRepository.fetchOne(
      {
        reference: data.reference,
      },
      true
    );

    if (!transaction?._id)
      return {
        success: false,
        message: TransactionMessages.TRANSACTION_NOT_FOUND,
      };

    if (transaction?.status != "pending")
      return {
        success: false,
        message: TransactionMessages.DUPLICATE_TRANSACTION,
      };

    const verifyAndUpdateTransactionRecord =
      await this.verifySuccessOfPayment(data);

    if (!verifyAndUpdateTransactionRecord.success) {
      await Promise.all([
        await NotificationRepository.createNotification({
          recipientId: new mongoose.Types.ObjectId(transaction.userId),
          userType: transaction.userType,
          title: "Payment",
          message: `Unconfirmed/failed payment of ${data.amount}`,
        }),
        await NotificationRepository.createNotification({
          title: "Payment",
          message: `Unconfirmed/failed payment of ${data.amount}`,
          recipientId: new mongoose.Types.ObjectId(transaction.userId),
          recipient: "Admin",
        }),
      ]);

      return {
        success: false,
        message: verifyAndUpdateTransactionRecord.message,
      };
    }
    if (transaction.paymentFor === "subscription") {
      // Create a new Date object
      let currentDate = new Date();

      // Add 30 days to the current date
      currentDate.setDate(currentDate.getDate() + transaction.activeDays);

      await SubscriberRepository.create({
        userType: transaction.userType,
        subscriberId: new mongoose.Types.ObjectId(transaction.userId),
        subscriptionId: new mongoose.Types.ObjectId(transaction.subscriptionId),
        transactionId: new mongoose.Types.ObjectId(transaction._id),
        expiryDate: currentDate,
        deliveriesLeft: transaction.activeDays,
        status: "active",
        dateSubscribed: new Date(),
      });
    }

    if (transaction.paymentFor === "delivery" && status === "confirmed") {
      const request = await RequestRepository.updateRequestDetails(
        {
          _id: new mongoose.Types.ObjectId(transaction.requestId),
        },
        { paymentStatus: "paid" }
      );

      if (!request) return { success: false, message: `Invalid request Id` };
    }

    return { success: true, message: TransactionMessages.PAYMENT_SUCCESS };
  }

  async verifyProviderPayment(reference) {
    const { data: response } = await this.paymentRequestHandler({
      method: "GET",
      url: `/transaction/verify/${reference}`,
    });

    if (response.status && response.message == "Verification successful") {
      return this.verifyCardPayment(response);
    }

    return { success: false, message: response.message };
  }
}

module.exports = { PaystackPaymentService };
