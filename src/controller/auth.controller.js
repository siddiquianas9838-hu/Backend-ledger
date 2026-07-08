const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");

/**
 * - User register controller
 * - POST /api/auth/register
 */
async function userRegisterController(req, res) {
  console.log(req.body);
  const { email, password, name } = req.body;

  console.log(email);
  // Reading data form table
  const isExist = await userModel.findOne({
    email: email,
  });
  //console.log("ANAS================",isExist)
  if (isExist) {
    return res.status(422).json({
      message: "User already exists in email",
      status: "failed",
    });
  }
  // Creating data into table
  const user = await userModel.create({
    email,
    password,
    name,
  });

  const token = jwt.sign({ userId: user._id }, process.env.jwt_SECRET, {
    expiresIn: "3d",
  });

  res.cookie("token", token);

  res.status(202).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    token,
  });
}

/**
 * - User Login Controller
 *  - Post /api/auth/login
 */

async function userLoginController(req, res) {
  const { email, password } = req.body;

  const user = await userModel.findOne({email}).select("+password")

  if (!user) {
    return res.status(401).json({
      message: "Email and password is INVALID",
    });
  }

  const isValidPassword = await user.comparePassword(password);

  if (!isValidPassword) {
    return res.status(401).json({
      message: "Email or password is INVALID",
    });
  }

  const token = jwt.sign({ userId: user._id }, process.env.jwt_SECRET, {
    expiresIn: "3d",
  });

  res.cookie("token", token);

  res.status(200).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    token,
  });
}

module.exports = {
  userRegisterController,
  userLoginController,
};
