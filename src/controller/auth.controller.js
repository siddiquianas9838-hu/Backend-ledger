const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const emailService = require("../services/email.service")
const tokenBlackListModel = require("../models/blackList.model")

/**
* - user register controller
* - POST /api/auth/register
*/
async function userRegisterController(req, res) {
    const { email, password, name } = req.body

//--==============--===============--===============    

    if (!email || !password  || password.length < 6){
         return res.status(422).json({
            message: "Email Id is Missing & Password must be at least 6 characters long",
            status: "failed"
        })
    }
//--===============--==============--==================    
     email = email.trim().toLowerCase();
//--==============--================--=================

   
//--===================--================--=============
    const isExists = await userModel.findOne({
        email: email
    })

    if (isExists) {
        return res.status(422).json({
            message: "User already exists with email.",
            status: "failed"
        })
    }

    const user = await userModel.create({
        email, password, name
    })

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })

    res.cookie("token", token)

    res.status(201).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        },
        token
    })

    await emailService.sendRegistrationEmail(user.email, user.name)
}

/**
 * - User Login Controller
 * - POST /api/auth/login
  */

// async function userLoginController(req, res) {
//     const { email, password } = req.body

//     const user = await userModel.findOne({ email }).select("+password")

//     if (!user) {
//         return res.status(401).json({
//             message: "Email or password is INVALID"
//         })
//     }

//     const isValidPassword = await user.comparePassword(password)

//     if (!isValidPassword) {
//         return res.status(401).json({
//             message: "Email or password is INVALID"
//         })
//     }

//     const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })

//     res.cookie("token", token)

//     res.status(200).json({
//         user: {
//             _id: user._id,
//             email: user.email,
//             name: user.name
//         },
//         token
//     })

// }

//||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||

async function userLoginController(req, res) {
    const { email, password } = req.body;

    const user = await userModel
        .findOne({ email: email.trim().toLowerCase() })
        .select("+password");

    if (!user) {
        return res.status(401).json({
            message: "Email or password is INVALID"
        });
    }

    //  Check if account is blocked
    if (
        user.loginBlockedUntil &&
        user.loginBlockedUntil > new Date()
    ) {
        return res.status(403).json({
            message: "Account is locked. Try again after 15 minutes."
        });
    }

    const isValidPassword = await user.comparePassword(password);

    //  Wrong Password
    if (!isValidPassword) {

        user.failedLoginAttempts++;

        // 5 wrong attempts
        if (user.failedLoginAttempts >= 5) {

            user.loginBlockedUntil = new Date(
                Date.now() + 15 * 60 * 1000
            );

            user.failedLoginAttempts = 0;
        }

        await user.save();

        return res.status(401).json({
            message: "Email or password is INVALID"
        });
    }

    //  Correct Password → Reset counter
    user.failedLoginAttempts = 0;
    user.loginBlockedUntil = null;

    await user.save();

    const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "3d" }
    );

    res.cookie("token", token);

    res.status(200).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        },
        token
    });
}


/**
 * - User Logout Controller
 * - POST /api/auth/logout
  */
async function userLogoutController(req, res) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[ 1 ]

    if (!token) {
        return res.status(200).json({
            message: "User logged out successfully"
        })
    }



    await tokenBlackListModel.create({
        token: token
    })

    res.clearCookie("token")

    res.status(200).json({
        message: "User logged out successfully"
    })

}

//--=================--===============--===============
//New api

async function userMeController(req, res) {

    const user = await userModel
        .findById(req.userId)
        .select("_id name email");

    if (!user) {
        return res.status(404).json({
            message: "User not found"
        });
    }

    return res.status(200).json({
        user
    });

}

//--===============--===============--===============


module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController,
    userMeController
}















































































// const userModel = require("../models/user.model");
// const jwt = require("jsonwebtoken");
// const emailService = require("../services/email.service")

// /**
//  * - User register controller
//  * - POST /api/auth/register
//  */
// async function userRegisterController(req, res) {
//   console.log(req.body);
//   const { email, password, name } = req.body;

//   console.log(email);
//   // Reading data form table
//   const isExist = await userModel.findOne({
//     email: email,
//   });
//   //console.log("ANAS================",isExist)
//   if (isExist) {
//     return res.status(422).json({
//       message: "User already exists in email",
//       status: "failed",
//     });
//   }
//   // Creating data into table
//   const user = await userModel.create({
//     email,
//     password,
//     name,
//   });

//   const token = jwt.sign({ userId: user._id }, process.env.jwt_SECRET, {
//     expiresIn: "3d",
//   });

//   res.cookie("token", token);

//   res.status(202).json({
//     user: {
//       _id: user._id,
//       email: user.email,
//       name: user.name,
//     },
//     token,
//   });
//   await emailService.sendRegistrationEmail(user.email, user.name)
// }

// /**
//  * - User Login Controller
//  *  - Post /api/auth/login
//  */

// async function userLoginController(req, res) {
//   const { email, password } = req.body;

//   const user = await userModel.findOne({email}).select("+password")

//   if (!user) {
//     return res.status(401).json({
//       message: "Email and password is INVALID",
//     });
//   }

//   const isValidPassword = await user.comparePassword(password);

//   if (!isValidPassword) {
//     return res.status(401).json({
//       message: "Email or password is INVALID",
//     });
//   }

//   const token = jwt.sign({ userId: user._id }, process.env.jwt_SECRET, {
//     expiresIn: "3d",
//   });

//   res.cookie("token", token);

//   res.status(200).json({
//     user: {
//       _id: user._id,
//       email: user.email,
//       name: user.name,
//     },
//     token,
//   });
// }

// module.exports = {
//   userRegisterController,
//   userLoginController,
// };
