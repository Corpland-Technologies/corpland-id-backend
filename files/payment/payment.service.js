const { default: mongoose } = require("mongoose");
const { PaymentRepository } = require("./payment.repository");
const { queryConstructor } = require("../../utils");
const { PaymentMessages } = require("./payment.messages");
const { PaystackPaymentService } = require("../../providers/paystack/paystack");
const paystackService = new PaystackPaymentService();

class PaymentService {
  static async createPayment(payload) {
    try {
      const payment = await PaymentRepository.create({
        ...payload.body,
        status: "pending"
      });

      if (!payment) {
        return { success: false, message: PaymentMessages.PAYMENT_FAILURE };
      }

      const paystackPayload = {
        email: payment.email,
        amount: payment.amount * 100,
        callbackUrl: `${config.FRONTEND_URL}/payment/verify`,
        metadata: {
          paymentId: payment._id.toString()
        }
      };

      const paystackResponse = await paystackService.initiatePayment(paystackPayload);

      if (!paystackResponse.success) {
        return { success: false, message: PaymentMessages.PAYMENT_FAILURE };
      }

      await PaymentRepository.updatePayment(
        { _id: payment._id },
        { referenceCode: paystackResponse.data.reference }
      );

      return { 
        success: true, 
        message: PaymentMessages.PAYMENT_SUCCESS, 
        data: {
          payment,
          paymentUrl: paystackResponse.data.authorizationUrl
        }
      };
    } catch (error) {
      console.log("error", error);
      return {
        success: false,
        message: "An error occurred while creating the payment.",
      };
    }
  }

  static async getAllPayments() {
    const payments = await PaymentRepository.fetchAllPayments();
    return {
      success: true,
      message: PaymentMessages.FETCH_SUCCESS,
      data: payments,
      count: payments.length,
    };
  }

  static async getPayment(payload) {
    let { error, params, limit, skip, sort } = queryConstructor(
      payload,
      "createdAt",
      "Payment"
    );
    if (error) return { success: false, message: error };

    const payments = await PaymentRepository.fetchPaymentByParams({
      ...params,
      ...extra,
      isDelete: false,
      limit,
      skip,
      sort,
    });

    if (!payments.length)
      return {
        success: true,
        message: PaymentMessages.DEVICE_NOT_FOUND,
        data: [],
      };

    return {
      success: true,
      message: PaymentMessages.FETCH_SUCCESS,
      data: payments,
      count: payments.length,
    };
  }

  static async updatePayment(params, payload) {
    let payment = await PaymentRepository.updatePayment(
      {
        _id: new mongoose.Types.ObjectId(params),
      },
      { ...payload }
    );

    if (!payment)
      return { success: false, message: PaymentMessages.UPDATE_ERROR };

    return {
      success: true,
      message: PaymentMessages.UPDATE,
    };
  }

  static async deletePayment(id) {
    const payment = await PaymentRepository.deletePayment({
      _id: new mongoose.Types.ObjectId(id),
    });

    if (!payment)
      return { success: false, message: PaymentMessages.DELETE_ERROR };

    return {
      success: true,
      message: PaymentMessages.DELETE,
    };
  }

  static async verifyPayment(reference) {
    try {
      const verificationResponse = await paystackService.verifyProviderPayment(reference);
      
      if (!verificationResponse.success) {
        return { success: false, message: PaymentMessages.PAYMENT_FAILURE };
      }

      const payment = await PaymentRepository.updatePayment(
        { referenceCode: reference },
        { status: "success" }
      );

      if (!payment) {
        return { success: false, message: PaymentMessages.UPDATE_ERROR };
      }

      return {
        success: true,
        message: PaymentMessages.PAYMENT_SUCCESS,
        data: payment
      };
    } catch (error) {
      console.log("error", error);
      return { success: false, message: PaymentMessages.PAYMENT_FAILURE };
    }
  }
}

module.exports = { PaymentService };
