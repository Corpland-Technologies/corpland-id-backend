const mongoose = require("mongoose");
const { Admin } = require("../admin/admin.model");

class AdminRepository {
  static async create(body) {
    return Admin.create(body);
  }

  static async fetchAdmin(body) {
    const admin = await Admin.findOne({ ...body });
    return admin;
  }

  static async findAdminParams(userPayload, select) {
    const { limit, skip, sort, ...restOfPayload } = userPayload;
    const admin = await Admin.find({ ...restOfPayload, isDelete: false })
      .select(select)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    return admin;
  }

  static async updateAdminDetails(query, params) {
    return Admin.findOneAndUpdate({ ...query }, { $set: { ...params } });
  }

  static async updateAdminById(payload, update) {
    return Admin.findOneAndUpdate(      
      {
        ...payload,
      },
      { ...update },
      { new: true, runValidators: true }
       );
  }

  static async search(query) {
    return Admin.find({ name: { $regex: query.name, $options: "i" } });
  }
}

module.exports = { AdminRepository };
