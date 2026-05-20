import { v2 as cloudinary} from "cloudinary";
import fs from "fs"





    // Configuration
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
            console.log("file is uploaded on cloudinary ",response.url);
            return response
            } catch (error) {
             fs.unlinkSync(localfilepath)
             //remove locally saved temporary file if any fail occurs in the 
            //in upload
        }
    }






    export {UploadOnCloudinary}
