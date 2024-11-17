const mongoose = require("mongoose");
const { User } = require("../user/user.model");

class UserRepository {
  static async create(body) {
    return User.create(body);
  }

  static async fetchUser(body) {
    const user = await User.findOne({ ...body });
    return user;
  }

  static async findUserParams(userPayload, select) {
    const { limit, skip, sort, ...restOfPayload } = userPayload;
    const user = await User.find({ ...restOfPayload, isDelete: false })
      .select(select)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    return user;
  }

  static async updateUserDetails(query, params) {
    return User.findOneAndUpdate({ ...query }, { $set: { ...params } });
  }

  static async updateUserById(payload, update) {
    return User.findOneAndUpdate(      
      {
        ...payload,
      },
      { ...update },
      { new: true, runValidators: true }
       );
  }

  static async search(query) {
    return User.find({ name: { $regex: query.name, $options: "i" } });
  }

   static async fetchUserByParams(payload) {
    const { limit, skip, sort, search, ...restOfPayload } = payload;

    let query = {};

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phoneNumber: { $regex: search, $options: "i" } },
        ],
      };
    }
    const user = await User.find({
      ...restOfPayload,
      ...query,
    })
      .sort(sort)
      .skip(skip)
      .limit(limit);

    return user;
  }
}

module.exports = { UserRepository };
