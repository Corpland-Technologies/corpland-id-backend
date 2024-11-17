const { default: mongoose } = require("mongoose");
const { DeviceRepository } = require("./device.repository");
const { queryConstructor } = require("../../utils");
const { DeviceMessages } = require("./device.messages");

class DeviceService {
  static async createDevice(payload) {
    try {
      const device = await DeviceRepository.create({
        ...payload.body,
      });

      if (!device) {
        return { success: false, msg: DeviceMessages.DEVICE_FAILURE };
      }

      return { success: true, msg: DeviceMessages.DEVICE_SUCCESS, device };
    } catch (error) {
      console.log("error", error);
      return {
        success: false,
        msg: "An error occurred while creating the device.",
      };
    }
  }

  static async getAllDevices() {
    const devices = await DeviceRepository.fetchAllDevices();
    return {
      success: true,
      msg: DeviceMessages.FETCH_SUCCESS,
      data: devices,
      count: devices.length,
    };
  }

  static async getDevice(payload) {
    let { error, params, limit, skip, sort } = queryConstructor(
      payload,
      "createdAt",
      "Device"
    );
    if (error) return { success: false, msg: error };

    const devices = await DeviceRepository.fetchDeviceByParams({
      ...params,
      ...extra,
      isDelete: false,
      limit,
      skip,
      sort,
    });

    if (!devices.length)
      return {
        success: true,
        msg: DeviceMessages.DEVICE_NOT_FOUND,
        data: [],
      };

    return {
      success: true,
      msg: DeviceMessages.FETCH_SUCCESS,
      data: devices,
      count: devices.length,
    };
  }

  static async updateDevice(params, payload) {
    let device = await DeviceRepository.updateDevice(
      {
        _id: new mongoose.Types.ObjectId(params),
      },
      { ...payload }
    );

    if (!device) return { success: false, msg: DeviceMessages.UPDATE_ERROR };

    return {
      success: true,
      msg: DeviceMessages.UPDATE,
    };
  }

  static async deleteDevice(id) {
    const device = await DeviceRepository.deleteDevice({
      _id: new mongoose.Types.ObjectId(id),
    });

    if (!device) return { success: false, msg: DeviceMessages.DELETE_ERROR };

    return {
      success: true,
      msg: DeviceMessages.DELETE,
    };
  }
}

module.exports = { DeviceService };
