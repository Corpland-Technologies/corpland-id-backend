const createBike = {
  model: {
    notEmpty: true,
    errorMessage: "model cannot be empty",
  },
  brand: {
    notEmpty: true,
    errorMessage: "brand cannot be empty",
  },
  year: {
    notEmpty: true,
    errorMessage: "year cannot be empty",
  },
  color: {
    notEmpty: true,
    errorMessage: "color cannot be empty",
  },
  plateNumber: {
    notEmpty: true,
    errorMessage: "plateNumber cannot be empty",
  },
  VIN: {
    notEmpty: true,
    errorMessage: "VIN cannot be empty",
  },
  IMEL: {
    notEmpty: true,
    errorMessage: "IMEL cannot be empty",
  },
};

module.exports = {
  createBike,
};
