const { Payment } = require("./payment.model");
const mongoose = require("mongoose");

class PaymentRepository {
  static async create(payload) {
    return Payment.create({ ...payload });
  }

  static async fetchAllPayments() {
    return Payment.find();
  }

  static async fetchOne(payload) {
    return Payment.findOne({ ...payload });
  }

  static async fetchPaymentByParams(payload) {
    const { limit, skip, sort, search, from, to, ...restOfPayload } = payload;

    let query = {};
    let range = {};

    const payment = await Payment.find({ ...range, ...query, ...restOfPayload })
      .sort(sort)
      .skip(skip)
      .limit(limit);
    return payment;
  }

  static async fetch(payload, select) {
    return Payment.find({ ...payload }).select(select);
  }

  static async fetchById(id) {
    const payment = await Payment.findById(id);
    return payment;
  }
  static async updatePayment(payload, update) {
    const payment = await Payment.findOneAndUpdate(
      {
        ...payload,
      },
      { ...update },
      { new: true, runValidators: true } //returns details about the update
    );

    return payment;
  }

  static async deletePayment(payload) {
    const payment = await Payment.findOneAndUpdate(
      { ...payload },
      { isDelete: true },
      { new: true }
    );

    return payment;
  }

  // static async search(query) {
  //   let { search } = query;

  //   if (!search) search = "";

  //   let extraParams = {};

  //   const results = await Payment.find({
  //     ...extraParams,
  //     receiverName: { $regex: search, $options: "i" },
  //   });

  //   return results;
  // }
}

module.exports = { PaymentRepository };
