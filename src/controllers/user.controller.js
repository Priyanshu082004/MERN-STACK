import { asyncHandler } from "../utils/asynHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { UploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(__filename);


const generateAccessAndRefreshTokens = async (userId)=>{
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Failed to generate access and refresh tokens");
  }
};


const registerUser = asyncHandler(async (req,res) => {
   const{username,email,fullName,password} = req.body
  //  console.log("email",email);  
    
//    if (fullName==="") {
//      throw new ApiErrorError(400,"Fullname is required")
//       }
      if ([fullName,email,username,password].some((field)=>field?.trim()==="")) {
        throw new ApiError(400,"All fields are required");
         }

      const existedUser = await User.findOne({
        $or: [{username},{email}]
       })

       if (existedUser) {
        throw new ApiError(409,"user with email or username already exist")
       }


      const avatarLocalPath =  req.files?.avatar[0]?.path
      //  console.log("files",req.files);
      //  const coverImageLocalPath= req.files?.coverImage[0]?.path;
         
      // classic way for coverImage 

        let coverImageLocalPath ;
        if (req.files &&  Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
            coverImageLocalPath = req.files.coverImage[0].path;
        }
     
     
       if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required");
        
     }

     const avatar = await UploadOnCloudinary(avatarLocalPath)
     const coverImage = await UploadOnCloudinary(coverImageLocalPath)

     if (!avatar) {
         throw new ApiError(400,"Avatar is required");
     }

     const user = await User.create({
        fullName,
        avatar : avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
     })

      const createdUser =   await User.findById(user._id).select(
       "-password -refreshToken" 
      )

      if (!createdUser) {
        throw new ApiError(500,"Something went wrong while registering the user ");
        
      }


      return res.status(201).json(
        new ApiResponse(200, createdUser , "User registered Succesfully")
      )

})

const loginUser = asyncHandler(async (req,res) => {
  const{email,password,username} = req.body
  if (!email || !username) {
    throw new ApiError(400,"Either email or username is required");
  }


   const user = await User.findOne({
  $or: [{email},{username}]
  })

   if (!user) {
    throw new ApiError(404,"User not found with this email or username")
   }
  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiError(401,"Invalid password")
  }

 const { accessToken, refreshToken } = 
 await generateAccessAndRefreshTokens(user._id);
  

const loggedInUser = await User.findById(user._id)
 .select("-password -refreshToken")

const options = {
  httpOnly: true,
  secure: true,

};

return res
.status(200)
.cookie("refreshToken", refreshToken, options)
.cookie("accessToken", accessToken, options)
.json(
  newApiResponse(
    200,
    {
      user: loggedInUser,
      accessToken,
      refreshToken
    }
  ),
  "User logged in successfully"
)

})

const logoutUser = asyncHandler(async (req,res) => {
    User.findByIdAndUpdate(req.user._id,{
          $set:{
            refreshToken: undefined
          }
    },{
        new:true
    }
  )
  const options = {
  httpOnly: true,
  secure: true,
  };

  return res
  .status(200)
  .clearCookie("refreshToken", options)
  .clearCookie("accessToken", options)
  .json(
    new ApiResponse(200, {}, "User logged out successfully")
  )
})


export {registerUser, loginUser, logoutUser}