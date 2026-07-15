const express = require("express")
const cookieParser = require("cookie-parser")



const app = express()


app.use(express.json())
app.use(cookieParser())

/**
 * - Routes required
 */
const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/account.routes")
const transactionRoutes = require("./routes/transaction.routes")

/**
 * - Use Routes
 */
//health checkup all project
app.get("/anas", (req, res) => {
    res.send("Ledger Service is up and running")
})

app.use("/api/auth", authRouter)
app.use("/api/accounts", accountRouter)
app.use("/api/transactions", transactionRoutes)

module.exports = app































// const express = require("express")
// const cookieParser = require("cookie-parser")

// /**
//  * - Routes required
//  */
// const authRouter = require("./routes/auth.routes")
// const accountRouter = require("./routes/account.routes")
// const transactionRoutes = require("./routes/transaction.routes");

// const app = express()

// /**
//  * -  Use routes
//  */
// app.use(express.json())
// app.use(cookieParser())


// app.use("/api/auth", authRouter)
// app.use("/api/account", accountRouter)
// app.use("/api/transactions", transactionRoutes)



// module.exports = app