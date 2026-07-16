const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const mongoose = require("mongoose")

/**
 * - Create a new transaction
 * THE 10-STEP TRANSFER FLOW:
     * 1. Validate request
     * 2. Validate idempotency key
     * 3. Check account status
     * 4. Derive sender balance from ledger
     * 5. Create transaction (PENDING)
     * 6. Create DEBIT ledger entry
     * 7. Create CREDIT ledger entry
     * 8. Mark transaction COMPLETED
     * 9. Commit MongoDB session
     * 10. Send email notification
 */

async function createTransaction(req, res) {

    /**
     * 1. Validate request
     */
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "FromAccount, toAccount, amount and idempotencyKey are required"
        })
    }

//  Prevent self-transfer
if (fromAccount === toAccount) {
    return res.status(400).json({
        message: "fromAccount and toAccount cannot be the same"
    });
}


// Amount Validation
if (
    typeof amount !== "number" ||
    amount <= 0 ||
    amount > 100000
) {
    return res.status(400).json({
        message: "Amount must be a number greater than 0 and less than or equal to 100000"
    });
}


    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
        user: req.user._id
    })

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })
//ownership check
    if (!fromUserAccount) {
        return res.status(403).json({
            message: "Forbidden. You can only transfer money from your own account."
        })
    }


if (!toUserAccount) {
    return res.status(400).json({
        message: "Invalid toAccount"
    });
}

// Currency rule
if (fromUserAccount.currency !== toUserAccount.currency) {
    return res.status(400).json({
        message: "Both accounts must have the same currency"
    });
}
    /**
     * 2. Validate idempotency key
     */

    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })

    if (isTransactionAlreadyExists) {
        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactionAlreadyExists
            })

        }

        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is still processing",
            })
        }

        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(500).json({
                message: "Transaction processing failed, please retry"
            })
        }

        if (isTransactionAlreadyExists.status === "REVERSED") {
            return res.status(500).json({
                message: "Transaction was reversed, please retry"
            })
        }
    }

    /**
     * 3. Check account status
     */

    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Both fromAccount and toAccount must be ACTIVE to process transaction"
        })
    }


//Check daily debit limit    
    const startOfDay = new Date();
startOfDay.setHours(0, 0, 0, 0);

const endOfDay = new Date();
endOfDay.setHours(23, 59, 59, 999);

const todayTransactions = await transactionModel.find({
    fromAccount: fromAccount,
    status: "COMPLETED",
    createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
    }
});

let todayDebit = 0;

for (const transaction of todayTransactions) {
    todayDebit += transaction.amount;
}

if (todayDebit + amount > 50000) {
    return res.status(400).json({
        message: "Daily debit limit of 50000 exceeded"
    });
}

    /**
     * 4. Derive sender balance from ledger
     */
    const balance = await fromUserAccount.getBalance()

    if (balance < amount) {
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`
        })
    }

    let transaction;
    try {


        /**
         * 5. Create transaction (PENDING)
         */
        const session = await mongoose.startSession()
        session.startTransaction()

        transaction = (await transactionModel.create([ {
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        } ], { session }))[ 0 ]

        const debitLedgerEntry = await ledgerModel.create([ {
            account: fromAccount,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT"
        } ], { session })

        await (() => {
            return new Promise((resolve) => setTimeout(resolve, 15 * 1000));
        })()

        const creditLedgerEntry = await ledgerModel.create([ {
            account: toAccount,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT"
        } ], { session })

        await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" },
            { session }
        )


        await session.commitTransaction()
        session.endSession()
    } 
    
//On failure inside the Mongo session, abort the session and mark transaction status as FAILED.

    catch (error) {

    if (session) {
        await session.abortTransaction();
        session.endSession();
    }

    if (transaction) {
        await transactionModel.findByIdAndUpdate(
            transaction._id,
            {
                status: "FAILED"
            }
        );
    }

    return res.status(500).json({
        message: "Transaction failed"
    });

}
    /**
     * 10. Send email notification
     */
    await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount)

    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction: transaction
    })

}

async function createInitialFundsTransaction(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        })
    }

//Add same idempotency behavior as normal transfer (if key already used, return existing result).    
const isTransactionAlreadyExists = await transactionModel.findOne({
    idempotencyKey: idempotencyKey
});

if (isTransactionAlreadyExists) {

    if (isTransactionAlreadyExists.status === "COMPLETED") {
        return res.status(200).json({
            message: "Transaction already processed",
            transaction: isTransactionAlreadyExists
        });
    }

    if (isTransactionAlreadyExists.status === "PENDING") {
        return res.status(200).json({
            message: "Transaction is still processing"
        });
    }

    if (isTransactionAlreadyExists.status === "FAILED") {
        return res.status(500).json({
            message: "Transaction processing failed, please retry"
        });
    }

    if (isTransactionAlreadyExists.status === "REVERSED") {
        return res.status(500).json({
            message: "Transaction was reversed, please retry"
        });
    }
}



//Add max fund amount (e.g. 1000000). Reject larger amounts.
    if (typeof amount !== "number" || amount <= 0 || amount > 1000000) {
    return res.status(400).json({
        message: "Initial funding amount must be greater than 0 and less than or equal to 1000000"
    });
}

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })

    if (!toUserAccount) {
        return res.status(400).json({
            message: "Invalid toAccount"
        })
    }

// Reject funding if target account status is not ACTIVE.
if (toUserAccount.status !== "ACTIVE") {
    return res.status(400).json({
        message: "Target account must be ACTIVE to receive initial funds"
    });
}

    const fromUserAccount = await accountModel.findOne({
        user: req.user._id
    })

    if (!fromUserAccount) {
        return res.status(400).json({
            message: "System user account not found"
        })
    }


    const session = await mongoose.startSession()
    session.startTransaction()

    const transaction = new transactionModel({
        fromAccount: fromUserAccount._id,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING"
    })

    const debitLedgerEntry = await ledgerModel.create([ {
        account: fromUserAccount._id,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT"
    } ], { session })

    const creditLedgerEntry = await ledgerModel.create([ {
        account: toAccount,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT"
    } ], { session })

    transaction.status = "COMPLETED"
    await transaction.save({ session })

    await session.commitTransaction()
    session.endSession()

    return res.status(201).json({
        message: "Initial funds transaction completed successfully",
        transaction: transaction
    })


}


async function getTransactionByIdController(req, res) {

    const { id } = req.params;

    // Logged-in user ke saare accounts
    const accounts = await accountModel.find({
        user: req.user._id
    });

    const accountIds = accounts.map(account => account._id);

    // Transaction dhoondo
    const transaction = await transactionModel.findOne({
        _id: id,
        $or: [
            { fromAccount: { $in: accountIds } },
            { toAccount: { $in: accountIds } }
        ]
    });

    if (!transaction) {
        return res.status(404).json({
            message: "Transaction not found or access denied"
        });
    }

    return res.status(200).json({
        transaction
    });

}


module.exports = {
    createTransaction,
    createInitialFundsTransaction,
    getTransactionByIdController
}







































































// const transactionModel = require("../models/transaction.model");
// const ledgerModel = require("../models/ledger.model");
// const accountModel = require("../models/account.model");
// const emailService = require("../services/email.service");
// const mongoose = require("mongoose");

// /**
//  * - Create a new transaction
//  * THE 10-STEP TRANSFER FLOW:
//  * 1. Validate request
//  * 2. Validate idempotency key
//  * 3. Check account status
//  * 4. Derive sender balance from ledger
//  * 5. Create transaction (PENDING)
//  * 6. Create DEBIT ledger entry
//  * 7. Create CREDIT ledger entry
//  * 8. Mark transaction COMPLETED
//  * 9. Commit MongoDB session
//  * 10. Send email notification
//  */

// async function createTransaction(req, res) {
//   /* 1. Validate request */
//   const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

//   if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
//     return res.status(400).json({
//       message:
//         "fromAccount, toAccount, amount, and idempotencyKey are required",
//     });
//   }

//   const fromUserAccount = await accountModel.findOne({
//     _id: fromAccount,
//   });

//   const toUserAccount = await accountModel.findOne({
//     _id: toAccount,
//   });

//   if (!fromUserAccount || !toUserAccount) {
//     return res
//       .status(404)
//       .json({ message: " Invalid fromAccount or toAccount" });
//   }
// }

//   async function createInitialFundsTransaction(req, res) {
//     const { toAccount, amount, idempotencyKey } = req.body;

//     if (!toAccount || !amount || !idempotencyKey) {
//       return res.status(400).json({
//         message: "toAccount, amount, and idempotencyKey are required",
//       });
//     }

//     const toUserAccount = await accountModel.findOne({
//       _id: toAccount,
//     });
//     if (!toUserAccount) {
//       return res.status(404).json({ message: "Invalid toAccount" });
//     }

//     const fromUserAccount = await accountModel.findOne({
//       systemUser: true,
//       user: req.user._id,
//     });

//     if (!fromUserAccount) {
//       return res.status(404).json({ message: "System user account not found" });
//     }
//     const session = await transactionModel.startSession();
//     session.startTransaction();

//     const transaction = await transactionModel.create(
//       {
//         fromAccount: fromUserAccount._id,
//         toAccount,
//         amount,
//         idempotencyKey,
//         status: "PENDING",
//       },
//       { session }
//     );

//     const debitLedgerEntry = await ledgerModel.create(
//       {
//         account: fromUserAccount._id,
//         amount: amount,
//         transaction: transaction._id,
//         type: "DEBIT",
//       },
//       { session }
//     );

//     const creditLedgerEntry = await ledgerModel.create(
//       {
//         account: toUserAccount._id,
//         amount: amount,
//         transaction: transaction._id,
//         type: "CREDIT",
//       },
//       { session }
//     );

//     transaction.status = "COMPLETED";
//     await transaction.save({ session });

//     await session.commitTransaction();
//     session.endSession();

//     return res.status(201).json({
//       message: "Initial funds transaction completed successfully",
//       transaction: transaction,
//     });

  
// }

// module.exports = {
//   createTransaction,
//   createInitialFundsTransaction,
// };





















//   /* 2. Validate idempotency key */
//   const isTransactionAlreadyExists = await transactionModel.findOne({
//     idempotencyKey: idempotencyKey,
//   });

//   if (isTransactionAlreadyExists) {
//     if (isTransactionAlreadyExists.status === "COMPLETED") {
//       return res.status(200).json({
//         message: "Transaction already processed",
//         transaction: isTransactionAlreadyExists,
//       });
//     }
//   }

//   if (isTransactionAlreadyExists.status === "PENDING") {
//     return res.status(200).json({
//       message: "Transaction is already pending",
//     });
//   }

//   if (isTransactionAlreadyExists.status === "FAILED") {
//     return res.status(200).json({
//       message: "Transaction has failed , please retry",
//     });
//   }

//   if (isTransactionAlreadyExists.status === "REVERSED") {
//     return res.status(200).json({
//       message: "Transaction was reversed , please retry",
//     });
//   }

//   /* 3. Check account status */
//   if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
//     return res.status(400).json({
//       message: "Both fromAccount and toAccount must be ACTIVE to process the transaction",
//     });
//   }

// /* 4. Derive sender balance from ledger */
// const balance = await fromUserAccount.getBalance();

// if (balance < amount) {
//   return res.status(400).json({
//     message: `Insufficient balance. Current balance is: ${balance}, Required: ${amount}`,
//   });

// }

// /* 5. Create transaction (PENDING) */
// const session = await transactionModel.startSession();
// session.startTransaction();

// const transaction = await transactionModel.create({
//     fromAccount,
//     toAccount,
//     amount,
//     idempotencyKey,
//     status: "PENDING"
// },
// { session });

// const debitLedgerEntry = await ledgerModel.create({
//     account: fromAccount,
//     amount: amount,
//     transaction: transaction._id,
//     type: "DEBIT"
// },
// { session });

// const creditLedgerEntry = await ledgerModel.create({
//     account: toAccount,
//     amount: amount,
//     transaction: transaction._id,
//     type: "CREDIT"
// },
// { session });

// transaction.status = "COMPLETED";
// await transaction.save({ session });

// await session.commitTransaction();
// session.endSession();

// /* 10. Send email notification */

// await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount);
// return res.status(201).json({
//     message: "Transaction completed successfully",
//     transaction,
// })

// }

// module.exports = {
//     createTransaction
// };
