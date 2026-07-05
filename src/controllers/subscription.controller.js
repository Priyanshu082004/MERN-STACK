import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

// ------------------------------------------------------------------
// TOGGLE SUBSCRIPTION (subscribe / unsubscribe to a channel)
// ------------------------------------------------------------------
const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    // 1. Validate the id
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id")
    }

    // 2. Confirm the channel (a channel is just a User) actually exists
    const channel = await User.findById(channelId)
    if (!channel) {
        throw new ApiError(404, "Channel not found")
    }

    // 3. Prevent a user from subscribing to their own channel
    if (channelId === req.user?._id.toString()) {
        throw new ApiError(400, "You cannot subscribe to your own channel")
    }

    // 4. Check if the subscription already exists
    const existingSubscription = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId
    })

    if (existingSubscription) {
        // Already subscribed -> unsubscribe (toggle off)
        await Subscription.findByIdAndDelete(existingSubscription._id)

        return res
            .status(200)
            .json(new ApiResponse(200, { subscribed: false }, "Unsubscribed successfully"))
    }

    // Not subscribed yet -> subscribe (toggle on)
    const newSubscription = await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId
    })

    return res
        .status(200)
        .json(new ApiResponse(200, { subscribed: true, subscription: newSubscription }, "Subscribed successfully"))
})

// ------------------------------------------------------------------
// GET SUBSCRIBER LIST OF A CHANNEL
// "Who has subscribed to this channel?"
// ------------------------------------------------------------------
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id")
    }

    const channel = await User.findById(channelId)
    if (!channel) {
        throw new ApiError(404, "Channel not found")
    }

    // We want every Subscription doc where "channel" == this channelId,
    // then for each one, join in the "subscriber" user's public info
    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber"
            }
        },
        { $unwind: "$subscriber" },
        {
            $project: {
                _id: 0,
                "subscriber._id": 1,
                "subscriber.username": 1,
                "subscriber.fullName": 1,
                "subscriber.avatar": 1
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribers,
                "Subscribers fetched successfully"
            )
        )
})

// ------------------------------------------------------------------
// GET CHANNEL LIST THAT A USER HAS SUBSCRIBED TO
// "Which channels does this user follow?"
// ------------------------------------------------------------------
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber id")
    }

    const subscriber = await User.findById(subscriberId)
    if (!subscriber) {
        throw new ApiError(404, "User not found")
    }

    // Same collection as above, but matched and joined in the OPPOSITE
    // direction: filter by "subscriber", join in the "channel" user's info
    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel"
            }
        },
        { $unwind: "$channel" },
        {
            $project: {
                _id: 0,
                "channel._id": 1,
                "channel.username": 1,
                "channel.fullName": 1,
                "channel.avatar": 1
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribedChannels,
                "Subscribed channels fetched successfully"
            )
        )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}