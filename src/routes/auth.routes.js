const express = require("express")
const authController = require("../controller/auth.controller")

const router = express.Router()


/* POST /api/auth/register */
router.post("/register", authController.userRegisterController)


/* POST /api/auth/login */
router.post("/login",authController.userLoginController)

/**
 * - POST /api/auth/logout
 */
router.post("/logout", authController.userLogoutController)


router.get("/me", authMiddleware, userMeController);


module.exports = router



































// const express = require("express")
// const authController = require("../controller/auth.controller")

// const router = express.Router()


// /* POST /api/auth/register */
// router.post("/register", authController.userRegisterController)

// /* POST /api/auth/login */
// router.post("/login",authController.userLoginController)




// module.exports = router