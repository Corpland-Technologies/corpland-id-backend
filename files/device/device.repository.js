const { Device } = require("./device.model");
const mongoose = require("mongoose");

class DeviceRepository {
  static async create(payload) {
    return Device.create({ ...payload });
  }

  static async fetchAllDevices() {
    return Device.find();
  }

  static async fetchOne(payload) {
    return Device.findOne({ ...payload });
  }

  static async fetchDeviceByParams(payload) {
    const { limit, skip, sort, search, from, to, ...restOfPayload } = payload;

    let query = {};
    let range = {};

    const device = await Device.find({ ...range, ...query, ...restOfPayload })
      .sort(sort)
      .skip(skip)
      .limit(limit);
    return device;
  }

  static async fetch(payload, select) {
    return Device.find({ ...payload }).select(select);
  }

  static async fetchById(id) {
    const device = await Device.findById(id);
    return device;
  }
  static async updateDevice(payload, update) {
    const device = await Device.findOneAndUpdate(
      {
        ...payload,
      },
      { ...update },
      { new: true, runValidators: true } //returns details about the update
    );

    return device;
  }

  static async deleteDevice(payload) {
    const device = await Device.findOneAndUpdate(
      { ...payload },
      { isDelete: true },
      { new: true }
    );

    return device;
  }

  // static async search(query) {
  //   let { search } = query;

  //   if (!search) search = "";

  //   let extraParams = {};

  //   const results = await Device.find({
  //     ...extraParams,
  //     receiverName: { $regex: search, $options: "i" },
  //   });

  //   return results;
  // }
}

module.exports = { DeviceRepository };
