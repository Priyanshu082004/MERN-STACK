import { Router } from "express";
import { registerUser,
   loginUser, 
   logoutUser,
    refreshAccesToken, 
    changeCurrentUserPassword, 
    getCurrentUser, updateAccountDetails, 
    updateUserAvatar, updateUserCoverImage ,
     getUserChannelProfile,
     getWatchHistory,
     deleteUserAvatarandCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router= Router()



router.route("/register").post(upload.fields([
    {name:"avatar",
        maxCount: 1
    },
    {name: "coverImage",
        maxCount: "1"}
]),registerUser)

router.route("/login").post(loginUser)


// secured routes 
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccesToken)
router.route("/change-password").post(verifyJWT,changeCurrentUserPassword)
router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/update-account-details").patch(verifyJWT,updateAccountDetails)
router.route("/update-avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/update-coverImage").patch (verifyJWT,upload.single("coverImage"),updateUserCoverImage)
router.route("/channel/:username").get(getUserChannelProfile)
router.route("/watch-history").get(verifyJWT,getWatchHistory)
router.route("/delete-avatar-and-cover-image").delete(verifyJWT,deleteUserAvatarandCoverImage)

// add more routes as needed 
export default router