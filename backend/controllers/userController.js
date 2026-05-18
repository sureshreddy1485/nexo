const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUpload');

// @desc  Search users by username
// @route GET /api/users/search?q=username
// @access Private
const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(200).json({ success: true, users: [] });

  const users = await User.find({
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { displayName: { $regex: q, $options: 'i' } },
    ],
    _id: { $ne: req.user._id },
    blockedUsers: { $nin: [req.user._id] },
  })
    .select('username displayName profilePicture bio isOnline lastSeen')
    .limit(20);

  res.status(200).json({ success: true, users });
});

// @desc  Get user profile by username
// @route GET /api/users/:username
// @access Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findOne({ username: req.params.username })
    .select('username displayName profilePicture bio isOnline lastSeen friends privacy');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({ success: true, user });
});

// @desc  Update own profile
// @route PUT /api/users/profile
// @access Private
const updateProfile = asyncHandler(async (req, res) => {
  const { displayName, bio, theme, privacy } = req.body;
  const user = await User.findById(req.user._id);

  if (displayName !== undefined) user.displayName = displayName;
  if (bio !== undefined) user.bio = bio;
  if (theme !== undefined) user.theme = theme;
  if (privacy !== undefined) user.privacy = { ...user.privacy, ...privacy };

  if (req.file) {
    if (user.profilePicture) {
      // Extract public_id from existing URL if needed
    }
    const result = await uploadToCloudinary(req.file.buffer, 'profiles', 'image');
    user.profilePicture = result.secure_url;
  }

  const updated = await user.save();
  res.status(200).json({ success: true, user: updated });
});

// @desc  Send friend request
// @route POST /api/users/:id/friend-request
// @access Private
const sendFriendRequest = asyncHandler(async (req, res) => {
  const targetUser = await User.findById(req.params.id);
  if (!targetUser) { res.status(404); throw new Error('User not found'); }
  if (targetUser._id.toString() === req.user._id.toString()) {
    res.status(400); throw new Error('Cannot send request to yourself');
  }
  if (targetUser.friends.includes(req.user._id)) {
    res.status(400); throw new Error('Already friends');
  }
  if (targetUser.friendRequests.includes(req.user._id)) {
    res.status(400); throw new Error('Request already sent');
  }

  targetUser.friendRequests.push(req.user._id);
  await targetUser.save();

  const sender = await User.findById(req.user._id);
  sender.sentRequests.push(targetUser._id);
  await sender.save();

  res.status(200).json({ success: true, message: 'Friend request sent' });
});

// @desc  Accept friend request
// @route POST /api/users/:id/accept-request
// @access Private
const acceptFriendRequest = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const requester = await User.findById(req.params.id);

  if (!requester) { res.status(404); throw new Error('User not found'); }
  if (!user.friendRequests.includes(requester._id)) {
    res.status(400); throw new Error('No pending request from this user');
  }

  user.friendRequests = user.friendRequests.filter(id => id.toString() !== requester._id.toString());
  user.friends.push(requester._id);
  await user.save();

  requester.sentRequests = requester.sentRequests.filter(id => id.toString() !== user._id.toString());
  requester.friends.push(user._id);
  await requester.save();

  res.status(200).json({ success: true, message: 'Friend request accepted' });
});

// @desc  Decline / cancel friend request
// @route POST /api/users/:id/decline-request
// @access Private
const declineFriendRequest = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.friendRequests = user.friendRequests.filter(id => id.toString() !== req.params.id);
  await user.save();

  const requester = await User.findById(req.params.id);
  if (requester) {
    requester.sentRequests = requester.sentRequests.filter(id => id.toString() !== req.user._id.toString());
    await requester.save();
  }

  res.status(200).json({ success: true, message: 'Request declined' });
});

// @desc  Block a user
// @route POST /api/users/:id/block
// @access Private
const blockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user.blockedUsers.includes(req.params.id)) {
    res.status(400); throw new Error('User already blocked');
  }
  user.blockedUsers.push(req.params.id);
  user.friends = user.friends.filter(id => id.toString() !== req.params.id);
  await user.save();
  res.status(200).json({ success: true, message: 'User blocked' });
});

// @desc  Unblock a user
// @route POST /api/users/:id/unblock
// @access Private
const unblockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== req.params.id);
  await user.save();
  res.status(200).json({ success: true, message: 'User unblocked' });
});

// @desc  Get friend requests
// @route GET /api/users/friend-requests
// @access Private
const getFriendRequests = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('friendRequests', 'username displayName profilePicture bio');
  res.status(200).json({ success: true, requests: user.friendRequests });
});

// @desc  Update camera active status
// @route PUT /api/users/camera-status
// @access Private
const updateCameraStatus = asyncHandler(async (req, res) => {
  const { isCameraActive } = req.body;
  await User.findByIdAndUpdate(req.user._id, { isCameraActive });
  res.status(200).json({ success: true });
});

module.exports = {
  searchUsers, getUserProfile, updateProfile, sendFriendRequest,
  acceptFriendRequest, declineFriendRequest, blockUser, unblockUser,
  getFriendRequests, updateCameraStatus,
};
