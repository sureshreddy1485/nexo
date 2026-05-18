const asyncHandler = require('express-async-handler');
const Story = require('../models/Story');
const User = require('../models/User');
const { uploadToCloudinary } = require('../utils/cloudinaryUpload');

// @desc  Create a story
// @route POST /api/stories
// @access Private
const createStory = asyncHandler(async (req, res) => {
  if (!req.file) { res.status(400); throw new Error('Media is required for a story'); }

  const { caption } = req.body;
  const mime = req.file.mimetype;
  const mediaType = mime.startsWith('video/') ? 'video' : 'image';
  const result = await uploadToCloudinary(req.file.buffer, 'stories', 'auto');

  const story = await Story.create({
    user: req.user._id,
    mediaUrl: result.secure_url,
    mediaType,
    caption: caption || '',
  });

  res.status(201).json({ success: true, story });
});

// @desc  Get stories of friends + self
// @route GET /api/stories
// @access Private
const getStories = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const friendIds = [...user.friends, req.user._id];

  const stories = await Story.find({ user: { $in: friendIds } })
    .populate('user', 'username displayName profilePicture')
    .sort({ createdAt: -1 });

  // Group by user
  const grouped = {};
  for (const story of stories) {
    const uid = story.user._id.toString();
    if (!grouped[uid]) grouped[uid] = { user: story.user, stories: [] };
    grouped[uid].stories.push(story);
  }

  res.status(200).json({ success: true, stories: Object.values(grouped) });
});

// @desc  View a story (add viewer)
// @route PUT /api/stories/:id/view
// @access Private
const viewStory = asyncHandler(async (req, res) => {
  await Story.findByIdAndUpdate(req.params.id, {
    $addToSet: { viewers: req.user._id },
  });
  res.status(200).json({ success: true });
});

// @desc  Delete own story
// @route DELETE /api/stories/:id
// @access Private
const deleteStory = asyncHandler(async (req, res) => {
  const story = await Story.findById(req.params.id);
  if (!story) { res.status(404); throw new Error('Story not found'); }
  if (story.user.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error('Cannot delete others\' stories');
  }
  await story.deleteOne();
  res.status(200).json({ success: true, message: 'Story deleted' });
});

module.exports = { createStory, getStories, viewStory, deleteStory };
