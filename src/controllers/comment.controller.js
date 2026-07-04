// get 
// add
// update
// delete


import mongoose ,{isValidObjectId} from 'mongoose';
import {Video} from '../models/video.model.js'
import {Comment} from '../models/comment.model.js'
import { ApiError } from '../utils/ApiError.js';
import {ApiResponse} from '../utils/ApiResponse.js';
import {asyncHandler} from '../utils/asyncHandler.js'




// GET ALL COMMENTS FOR A VIDEO (paginated)

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    // 1. Validate the videoId — bad/missing IDs should never hit the DB
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    } 


        // 2. Make sure the video actually exists before fetching its comments
      
        
        const video = await Video.findById(videoId)
        if(!video){
            throw new ApiError(404, "Video not found")
        }

       // 3. Aggregation pipeline: match comments for this video,
      //    then join the "owner" (user) info via $lookup so the frontend
      //    gets username/avatar without a second request per comment

       const commentsAggregate = Comment.aggregate([
           {
            $match:{
                video: new mongoose.Types.ObjectId(videoId)
            }
           },
           {
             $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner"

           }
        },
         {
            // $lookup always returns an array — unwind it to a single object
            $unwind: "$owner"
        },
         {
            $sort: { createdAt: -1 } // newest comments first
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                "owner.username": 1,
                "owner.fullName": 1,
                "owner.avatar": 1
            }
        }
        ])
          
    // 4. Paginate using the plugin 
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

   })


const addComment = asyncHandler(async (req, res) => {
      const { videoId } = req.params
      const {content} = req.body

 // 1. Validate inputs
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content is required")
    }

    // 2. Confirm the video exists
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
     


    // 3. Create the comment — owner comes from the verifyJWT middleware
    //    (req.user is set there), not from the request body, so users
    //    can't fake someone else's comment

    const comment= await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    })

    if (!comment) {
        throw new ApiError(500, "Failed to create comment")
    }  
    
    return res
    .status(201)
    .json(new ApiResponse(201, "Comment added successfully"))
       
})


// UPDATE A COMMENT (only the owner can update their comment)
const updateComment = asyncHandler(async (req, res) => {
   const {commentId} = req.params  
   const {content} = req.body

   // 1. Validate inputs
   if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id")
   }    

   if (!content || content.trim() === "") {
    throw new ApiError(400, "Comment content is required")
   }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    // Ownership check — only the person who wrote the comment can edit it
    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to edit this comment")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        { $set: { content } },
         { new: true }      //return the updated comment
    )

    return res
    .status(200)
    .json(new ApiResponse(200, "Comment updated successfully"))

})



// DELETE A COMMENT (only the owner can delete their comment)
const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
     if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    // Same ownership check as update — only the author can delete
    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this comment")
    }

    await Comment.findByIdAndDelete(commentId) 

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"))

})


export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment   
}