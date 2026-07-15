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

//--===============--================--===============

import asyncHandler from 'express-async-handler';
import httpStatus from 'http-status';
import { accountService } from '../services/account.service.js';

/**
 * @desc    Get account balance
 * @route   GET /api/v1/accounts/:accountId/balance
 * @access  Private
 */
export const getAccountBalanceController = asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const userId = req.user._id;

    // 1. Service layer handling business logic
    const balanceData = await accountService.fetchAccountBalance({ accountId, userId });

    // 2. Clean and consistent response structure
    return res.status(httpStatus.OK).json({
        success: true,
        message: "Account balance retrieved successfully",
        data: balanceData
    });
});


module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController
}









































































































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
