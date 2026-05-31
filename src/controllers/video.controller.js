// get all videos do at first priority
//  publish a video
// get videoid
// update a video
// delete a video
//  toggle status
import { Video } from "../models/video.model.js";

export const getAllVideos = async (req, res) => { 
    try {
        const videos = await Video.find().populate("uploader", "username avatar");
        res.status(200).json(videos);
    } catch (error) {
        res.status(500).json({ message: "Error fetching videos", error: error.message });
    }
}