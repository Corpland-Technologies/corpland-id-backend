const mongoose = require("mongoose");
const { config } = require("../../core/config");
const { PaymentMessages } = require("../../files/payment/payment.messages");
const { PaymentRepository } = require("../../files/payment/payment.repository");

const RequestHandler = require("../../utils/axios.provision");
const { providerMessages } = require("../providers.messages");

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
      responseStatus = "success";
    } else {
      responseStatus = "failed";
    }

    const updatedExisting = await PaymentRepository.updatePayment(
      { referenceCode: payload.reference },
      { status: responseStatus }
    );

    if (!updatedExisting)
      return { success: false, message: PaymentMessages.PAYMENT_FAILURE };

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
    const { data } = payload;
    const payment = await PaymentRepository.fetchOne({
      referenceCode: data.reference,
    });

    if (!payment)
      return {
        success: false,
        message: PaymentMessages.NOT_FOUND,
      };

    if (payment.status !== "pending")
      return {
        success: false,
        message: PaymentMessages.EXIST,
      };

    const verifyAndUpdatePaymentRecord =
      await this.verifySuccessOfPayment(data);

    if (!verifyAndUpdatePaymentRecord.success) {
      return {
        success: false,
        message: verifyAndUpdatePaymentRecord.message,
      };
    }

    return { success: true, message: PaymentMessages.PAYMENT_SUCCESS };
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
