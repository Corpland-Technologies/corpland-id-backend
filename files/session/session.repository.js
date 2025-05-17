const { Session } = require("./session.model");
const mongoose = require("mongoose");

class SessionRepository {
  static async create(payload) {
    return Session.create({ ...payload });
  }

  static async fetchAllSessions() {
    return Session.find();
  }

  static async fetchOne(payload) {
    return Session.findOne({ ...payload, isDelete: false });
  }

  static async fetchSessionByParams(payload) {
    const { limit, skip, sort, search, from, to, ...restOfPayload } = payload;

    let query = {};
    let range = {};

    const session = await Session.find({
      ...range,
      ...query,
      ...restOfPayload,
      isDelete: false,
    })
      .sort(sort)
      .skip(skip)
      .limit(limit);
    return session;
  }

  static async fetch(payload, select) {
    return Session.find({ ...payload, isDelete: false }).select(select);
  }

  static async fetchById(id) {
    const session = await Session.findById(id);
    return session;
  }
  static async updateSession(payload, update) {
    const session = await Session.findOneAndUpdate(
      {
        ...payload,
      },
      { ...update },
      { new: true, runValidators: true } //returns details about the update
    );

    return session;
  }

  static async deleteSession(payload) {
    const session = await Session.findOneAndUpdate(
      { ...payload },
      { isDelete: true },
      { new: true }
    );

    return session;
  }

  static async deleteAllSession(payload) {
    const session = await Session.updateMany(
      { ...payload },
      { isDelete: true },
      { new: true }
    );

    return session;
  }

  // static async search(query) {
  //   let { search } = query;

  //   if (!search) search = "";

  //   let extraParams = {};

  //   const results = await Session.find({
  //     ...extraParams,
  //     receiverName: { $regex: search, $options: "i" },
  //   });

  //   return results;
  // }
}

module.exports = { SessionRepository };
