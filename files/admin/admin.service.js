const mongoose = require("mongoose");
const { AdminRepository } = require("./admin.repository");
const {
  hashPassword,
  verifyPassword,
  tokenHandler,
  queryConstructor,
  AlphaNumeric,
} = require("../../utils/index");
const { adminMessages } = require("./admin.messages");
const { FORBIDDEN } = require("../../constants/statusCode");
const { sendMailNotification } = require("../../utils/email");
const { AuthMessages } = require("../auth/auth.messages");
const { Admin } = require("./admin.model");

class AdminService {
  static async adminSignUpService(body) {
    const admin = await AdminRepository.fetchAdmin({
      $or: [{ email: body.email }, { phoneNumber: body.phoneNumber }],
    });

    if (admin) {
      return { SUCCESS: false, message: adminMessages.ADMIN_EXISTS };
    }

    const password = await hashPassword(body.password);
    const signUp = await AdminRepository.create({ ...body, password });

    const substitutional_parameters = {
      email: body.email,
      name: body.name,
      password: body.password,
    };
    try {
      await sendMailNotification(
        body.email,
        "Admin Creation",
        substitutional_parameters,
        "ADMIN_CREATION",
        true
      );
    } catch (error) {
      console.log("sendgrid error", error);
    }

    return {
      SUCCESS: true,
      message: adminMessages.ADMIN_CREATED,
      data: signUp,
    };
  }

  static async adminLoginService(body) {
    const admin = await AdminRepository.fetchAdmin({
      email: body.email,
    });

    if (!admin) {
      return {
        SUCCESS: false,
        message: AuthMessages.LOGIN_ERROR,
      };
    }

    //confirm if admin has been deleted
    if (admin.isDelete)
      return { success: false, message: adminMessages.SOFTDELETE };

    const passwordCheck = await verifyPassword(body.password, admin.password);

    if (!passwordCheck) {
      return { SUCCESS: false, message: adminMessages.LOGIN_ERROR };
    }

    const token = await tokenHandler({
      name: admin.name,
      email: admin.email,
      _id: admin._id,
      isAdmin: true,
    });
    admin.password = undefined;
    return {
      SUCCESS: true,
      message: adminMessages.ADMIN_FOUND,
      data: { admin, ...token },
    };
  }

  static async getAdminService(userPayload, select) {
    const { error, params, limit, skip, sort } = queryConstructor(
      userPayload,
      "createdAt",
      "Admin"
    );
    if (error) return { success: false, message: error };

    const getAdmin = await AdminRepository.findAdminParams({
      ...params,
      select,
      limit,
      skip,
      sort,
    });

    const count = getAdmin.length;

    if (getAdmin.length < 1)
      return { SUCCESS: false, message: adminMessages.ADMIN_NOT_FOUND };

    return {
      SUCCESS: true,
      message: adminMessages.ADMIN_FOUND,
      data: getAdmin,
      count,
    };
  }

  static async updateAdminService(data) {
    const { body, params } = data;

    // if (data.payload.isDelete) return { SUCCESS: false, message: adminMessages.SOFTDELETE }

    const admin = await AdminRepository.updateAdminById(
      { _id: new mongoose.Types.ObjectId(params.id) },
      { $set: { ...body } }
    );

    if (!admin) {
      return {
        SUCCESS: false,
        message: adminMessages.UPDATE_PROFILE_FAILURE,
      };
    } else {
      return {
        SUCCESS: true,
        message: adminMessages.UPDATE_PROFILE_SUCCESS,
        admin,
      };
    }
  }

  static async changePassword(body) {
    //change password within the app when user knows his previous password
    const { prevPassword } = body;

    const admin = await AdminRepository.fetchAdmin({
      _id: new mongoose.Types.ObjectId(body.id),
    });

    if (!admin)
      return { success: false, message: AuthMessages.ADMIN_NOT_FOUND };

    const prevPasswordCheck = await verifyPassword(
      prevPassword,
      admin.password
    );
    console.log("prev", prevPassword);
    if (!prevPasswordCheck)
      return { success: false, message: AuthMessages.INCORRECT_PASSWORD };

    if (body.password !== body.confirmPassword) {
      return {
        SUCCESS: false,
        message: "Passwords mismatch",
      };
    }

    let password = await hashPassword(body.password);

    const changePassword = await AdminRepository.updateAdminDetails(
      { _id: new mongoose.Types.ObjectId(body.id) },
      {
        password,
      }
    );
    console.log("pass", password);

    if (changePassword) {
      return {
        SUCCESS: true,
        message: AuthMessages.PASSWORD_RESET_SUCCESS,
      };
    } else {
      return {
        SUCCESS: false,
        message: AuthMessages.PASSWORD_RESET_FAILURE,
      };
    }
  }

  static async uploadImageService(data, payload) {
    const { image } = data;

    const admin = await AdminRepository.updateAdminById(payload._id, { image });
    if (!admin) return { success: false, message: adminMessages.UPDATE_ERROR };
    return { success: true, message: adminMessages.UPDATE_SUCCESS };
  }

  static async getLoggedInAdmin(adminPayload) {
    const { _id } = adminPayload;

    const getAdmin = await AdminRepository.fetchAdmin({
      _id: new mongoose.Types.ObjectId(_id),
    });
    getAdmin.password = undefined;
    if (!getAdmin)
      return { SUCCESS: false, message: adminMessages.ADMIN_NOT_FOUND };

    return {
      SUCCESS: true,
      message: adminMessages.ADMIN_FOUND,
      data: getAdmin,
    };
  }

  static async deleteAdminService(data) {
    const { params } = data;

    const deleteAdmin = await AdminRepository.updateAdminById(params.id, {
      isDelete: true,
    });

    if (!deleteAdmin)
      return { SUCCESS: false, message: adminMessages.UPDATE_PROFILE_FAILURE };

    return {
      SUCCESS: true,
      message: adminMessages.UPDATE_PROFILE_SUCCESS,
      deleteAdmin,
    };
  }

  static async searchAdmin(query) {
    const { error, params, limit, skip, sort } = queryConstructor(
      query,
      "createdAt",
      "Admin"
    );

    if (error) return { success: false, message: error };

    const adminData = await AdminRepository.search({
      ...params,
      limit,
      skip,
      sort,
    });

    if (adminData.length < 1)
      return {
        SUCCESS: false,
        message: adminMessages.ADMIN_NOT_FOUND,
        data: [],
      };

    return {
      SUCCESS: true,
      message: adminMessages.ADMIN_FOUND,
      data: adminData,
    };
  }
}

module.exports = { AdminService };
