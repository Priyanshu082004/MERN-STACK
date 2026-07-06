import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

// ------------------------------------------------------------------
// GET CHANNEL STATS: total views, subscribers, videos, likes
// (this is for the logged-in user's OWN dashboard)
// ------------------------------------------------------------------
const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user?._id

    // 1. Total subscribers -> count Subscription docs where channel = me
    const totalSubscribers = await Subscription.countDocuments({
        channel: userId
    })

    // 2. Video-level stats: total videos, total views, total likes
    //    all computed in ONE aggregation pass over the Video collection
    const videoStats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            // Join in likes for each video so we can count them
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" }
            }
        },
        {
            // Collapse ALL matched videos into a single summary document
            $group: {
                _id: null,                              // group everything into one bucket
                totalVideos: { $sum: 1 },                // count of video documents
                totalViews: { $sum: "$views" },          // sum of the "views" field across all
                totalLikes: { $sum: "$likesCount" }      // sum of the per-video like counts
            }
        }
    ])

    // videoStats will be an array with 0 or 1 element.
    // 0 elements means the channel has no videos yet — handle that case.
    const stats = videoStats[0] || {
        totalVideos: 0,
        totalViews: 0,
        totalLikes: 0
    }

    const channelStats = {
        totalSubscribers,
        totalVideos: stats.totalVideos,
        totalViews: stats.totalViews,
        totalLikes: stats.totalLikes
    }

    return res
        .status(200)
        .json(new ApiResponse(200, channelStats, "Channel stats fetched successfully"))
})

// ------------------------------------------------------------------
// GET ALL VIDEOS UPLOADED BY THE CHANNEL (owner's own dashboard list)
// ------------------------------------------------------------------
const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id

    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "comments"
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                commentsCount: { $size: "$comments" }
            }
        },
        {
            $sort: { createdAt: -1 } // newest uploads first
        },
        {
            $project: {
                title: 1,
                description: 1,
                thumbnail: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                likesCount: 1,
                commentsCount: 1,
                createdAt: 1
            }
        }
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Channel videos fetched successfully"))
})

export {
    getChannelStats,
    getChannelVideos
}