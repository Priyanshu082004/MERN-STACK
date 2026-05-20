import { v2 as cloudinary} from "cloudinary";
import fs from "fs"
import { configDotenv } from "dotenv";

    configDotenv();


    // Configuration
    console.log("Cloudinary config - Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
    console.log("Cloudinary config - API Key:", process.env.CLOUDINARY_API_KEY ? "SET" : "NOT SET");
    console.log("Cloudinary config - API Secret:", process.env.CLOUDINARY_API_SECRET ? "SET" : "NOT SET");
    
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET, 
    });



    const UploadOnCloudinary = async (localfilepath)=>{
        try {
            if (!localfilepath) return null
            //upload file
            const response = await cloudinary.uploader.upload(localfilepath,{
                resource_type: "auto"
            })
            //file upload successfully
            // console.log("file is uploaded on cloudinary ",response.url);
            fs.unlinkSync(localfilepath)
            return response
            } catch (error) {
             fs.unlinkSync(localfilepath)
             //remove locally saved temporary file if any fail occurs in the 
            //in upload
        }
    }






    export {UploadOnCloudinary}
