import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comment.model.js"
import { Tweet } from "../models/tweet.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"



// TOGGLE LIKE ON A VIDEO


const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    // 1. Validate the id
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    // 2. Confirm the video exists
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    // 3. Check if this user already liked this video
    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id
    })

    if (existingLike) {
        // Already liked -> unlike it (toggle off)
        await Like.findByIdAndDelete(existingLike._id)

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }, "Video unliked successfully"))
    }

    // Not liked yet -> like it (toggle on)
    const newLike = await Like.create({
        video: videoId,
        likedBy: req.user?._id
    })

    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true, like: newLike }, "Video liked successfully"))
})


// TOGGLE LIKE ON A COMMENT

const toggleCommentLike = asyncHandler(async (req, res) => {

    const { commentId } = req.params

    // 1. Validate the id
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id
    })


    if (existingLike) {
        // Already liked -> unlike it (toggle off)
        await Like.findByIdAndDelete(existingLike._id)

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }, "Comment unliked successfully"))
    }

    // Not liked yet -> like it (toggle on)
    const newLike = await Like.create({
        comment: commentId,
        likedBy: req.user?._id
    })

    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true, like: newLike }, "Comment liked successfully"))
})

// TOGGLE LIKE ON A TWEET

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id)

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }, "Tweet unliked successfully"))
    }

    const newLike = await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true, like: newLike }, "Tweet liked successfully"))
})





//  Get all videos liked by the current user 


const getLikedVideos = asyncHandler(async (req, res) => {
   // Aggregation pipeline:
    // 1. Find all "Like" docs by this user where "video" field exists
    // 2. Join with the videos collection to get full video details
    // 3. Join with users collection to get the video owner's info
   
     const likedVideosAggregate = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
                video: { $exists: true, $ne: null } // only like-docs that point to a video
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner"
                        }
                    },
                    {
                        $unwind: "$owner"
                    },
                    {
                        $project: {
                            title: 1,
                            description: 1,
                            thumbnail: 1,
                            duration: 1,
                            views: 1,
                            isPublished: 1,
                            createdAt: 1,
                            "owner.username": 1,
                            "owner.fullName": 1,
                            "owner.avatar": 1
                        }
                    }
                ]
            }
        },
        {
            // $lookup returns an array — unwind it to a single object
            $unwind: "$likedVideo"
        },
        {
            $sort: { createdAt: -1 } // most recently liked first
        },
        {
            $project: {
                _id: 0,
                likedVideo: 1
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                likedVideosAggregate,
                "Liked videos fetched successfully"
            )
        )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}

