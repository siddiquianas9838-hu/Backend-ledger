
const accountModel = require("../models/account.model");


async function createAccountController(req, res) {

    const user = req.user;

    const account = await accountModel.create({
        user: user._id
    })

    res.status(201).json({
        account
    })

}

async function getUserAccountsController(req, res) {

    const accounts = await accountModel.find({ user: req.user._id });

    res.status(200).json({
        accounts
    })
}

async function getAccountBalanceController(req, res) {
    const { accountId } = req.params;

    const account = await accountModel.findOne({
        _id: accountId,
        user: req.user._id
    })

    if (!account) {
        return res.status(404).json({
            message: "Account not found"
        })
    }

    const balance = await account.getBalance();

    res.status(200).json({
        accountId: account._id,
        balance: balance
    })
}


module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController
}



//|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||


// const accountModel = require("../models/account.model");


// async function createAccountController(req, res) {

//     const user = req.user;
//       const { currency, name } = req.body;

//     // Count user's existing accounts
//     const accountCount = await accountModel.countDocuments({
//         user: user._id
//     });

//     // Maximum 3 accounts allowed
//     if (accountCount >= 3) {
//         return res.status(400).json({
//             message: "Maximum 3 accounts are allowed."
//         });
//     }

//     const account = await accountModel.create({
//         user: user._id,
//         currency,
//         name
//     });

//     res.status(201).json({
//         account
//     });

// }

// async function getUserAccountsController(req, res) {

//     const { status } = req.query;

//     const filter = {
//         user: req.user._id
//     };

//     // Agar status query me aaya hai to filter add karo
//     if (status) {
//         filter.status = status;
//     }

//     const accounts = await accountModel.find(filter);

//     res.status(200).json({
//         accounts
//     });

// }

// async function getAccountBalanceController(req, res) {
//     const { accountId } = req.params;

//     const account = await accountModel.findOne({
//         _id: accountId,
//         user: req.user._id
//     });

//     if (!account) {
//         return res.status(404).json({
//             message: "Account not found"
//         });
//     }

//     //  Assignment Requirement
//     if (account.status === "CLOSED") {
//         return res.status(400).json({
//             message: "Cannot view balance. Account is CLOSED."
//         });
//     }

//     const balance = await account.getBalance();

//     res.status(200).json({
//         accountId: account._id,
//         balance
//     });
// }


// async function freezeAccountController(req, res) {

//     const { accountId } = req.params;

//     const account = await accountModel.findOne({
//         _id: accountId,
//         user: req.user._id
//     });

//     if (!account) {
//         return res.status(404).json({
//             message: "Account not found"
//         });
//     }

//     account.status = "FROZEN";

//     await account.save();

//     res.status(200).json({
//         message: "Account frozen successfully",
//         account
//     });

// }


// async function unfreezeAccountController(req, res) {

//     const { accountId } = req.params;

//     const account = await accountModel.findOne({
//         _id: accountId,
//         user: req.user._id
//     });

//     if (!account) {
//         return res.status(404).json({
//             message: "Account not found"
//         });
//     }

//     account.status = "ACTIVE";

//     await account.save();

//     res.status(200).json({
//         message: "Account unfrozen successfully",
//         account
//     });

// }


// async function closeAccountController(req, res) {

//     const { accountId } = req.params;

//     const account = await accountModel.findOne({
//         _id: accountId,
//         user: req.user._id
//     });

//     if (!account) {
//         return res.status(404).json({
//             message: "Account not found"
//         });
//     }

//     const balance = await account.getBalance();

//     if (balance !== 0) {
//         return res.status(400).json({
//             message: "Account cannot be closed. Balance must be 0."
//         });
//     }

//     account.status = "CLOSED";

//     await account.save();

//     res.status(200).json({
//         message: "Account closed successfully",
//         account
//     });

// }

// module.exports = {
//     createAccountController,
//     getUserAccountsController,
//     getAccountBalanceController,
//     freezeAccountController
// }









































































































// const accountModel = require("../models/account.model");

// async function createAccountController(req, res) {
//   const user = req.user;

//   const account = await accountModel.create({
//     user: user._id,
//   });

//   res.status(201).json({
//     account,
//   });
// }

// module.exports = {
//   createAccountController,
// };
