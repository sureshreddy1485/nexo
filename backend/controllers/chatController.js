const asyncHandler = require('express-async-handler');
const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');
const { uploadToCloudinary } = require('../utils/cloudinaryUpload');

// @desc  Access or create a 1-to-1 chat
// @route POST /api/chats
// @access Private
const accessChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) { res.status(400); throw new Error('userId is required'); }

  let chat = await Chat.findOne({
    isGroupChat: false,
    isChannel: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate('users', '-password -securityKey')
    .populate('latestMessage');

  if (chat) {
    chat = await User.populate(chat, { path: 'latestMessage.sender', select: 'username displayName profilePicture' });
    return res.status(200).json({ success: true, chat });
  }

  const newChat = await Chat.create({ users: [req.user._id, userId], isGroupChat: false });
  const fullChat = await Chat.findById(newChat._id).populate('users', '-password -securityKey');

  res.status(201).json({ success: true, chat: fullChat });
});

// @desc  Get all chats for a user
// @route GET /api/chats
// @access Private
const getChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
    .populate('users', 'username displayName profilePicture isOnline lastSeen isCameraActive')
    .populate('groupAdmin', 'username displayName profilePicture')
    .populate('admins', 'username displayName profilePicture')
    .populate({
      path: 'latestMessage',
      populate: { path: 'sender', select: 'username displayName profilePicture' },
    })
    .sort({ updatedAt: -1 });

  res.status(200).json({ success: true, chats });
});

// @desc  Create group chat
// @route POST /api/chats/group
// @access Private
const createGroupChat = asyncHandler(async (req, res) => {
  const { name, users, description, isPublic, groupUsername } = req.body;

  if (!name || !users || users.length < 2) {
    res.status(400);
    throw new Error('Group name and at least 2 users are required');
  }

  const allUsers = [...new Set([...users, req.user._id.toString()])];

  const groupData = {
    chatName: name,
    isGroupChat: true,
    users: allUsers,
    groupAdmin: req.user._id,
    admins: [req.user._id],
    description,
    isPublic: isPublic || false,
  };

  if (groupUsername) groupData.groupUsername = groupUsername.toLowerCase();

  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, 'groups', 'image');
    groupData.groupPicture = result.secure_url;
  }

  const group = await Chat.create(groupData);
  const fullGroup = await Chat.findById(group._id)
    .populate('users', '-password -securityKey')
    .populate('groupAdmin', 'username displayName profilePicture')
    .populate('admins', 'username displayName profilePicture');

  res.status(201).json({ success: true, chat: fullGroup });
});

// @desc  Update group info
// @route PUT /api/chats/group/:id
// @access Private
const updateGroup = asyncHandler(async (req, res) => {
  const { name, description, isPublic } = req.body;
  const chat = await Chat.findById(req.params.id);

  if (!chat || !chat.isGroupChat) { res.status(404); throw new Error('Group not found'); }

  const isAdmin = chat.admins.some(a => a.toString() === req.user._id.toString());
  if (!isAdmin) { res.status(403); throw new Error('Only admins can update group info'); }

  if (name) chat.chatName = name;
  if (description !== undefined) chat.groupDescription = description;
  if (isPublic !== undefined) chat.isPublic = isPublic;

  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, 'groups', 'image');
    chat.groupPicture = result.secure_url;
  }

  const updated = await chat.save();
  const fullChat = await Chat.findById(updated._id)
    .populate('users', '-password -securityKey')
    .populate('groupAdmin admins', 'username displayName profilePicture');

  res.status(200).json({ success: true, chat: fullChat });
});

// @desc  Add user to group
// @route PUT /api/chats/group/:id/add
// @access Private
const addToGroup = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const chat = await Chat.findById(req.params.id);
  if (!chat) { res.status(404); throw new Error('Group not found'); }

  const isAdmin = chat.admins.some(a => a.toString() === req.user._id.toString());
  if (!isAdmin) { res.status(403); throw new Error('Only admins can add members'); }

  if (chat.users.includes(userId)) { res.status(400); throw new Error('User already in group'); }
  if (chat.bannedUsers.includes(userId)) { res.status(400); throw new Error('User is banned'); }

  chat.users.push(userId);
  await chat.save();

  const updated = await Chat.findById(chat._id).populate('users', '-password -securityKey');
  res.status(200).json({ success: true, chat: updated });
});

// @desc  Remove user from group
// @route PUT /api/chats/group/:id/remove
// @access Private
const removeFromGroup = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const chat = await Chat.findById(req.params.id);
  if (!chat) { res.status(404); throw new Error('Group not found'); }

  const isAdmin = chat.admins.some(a => a.toString() === req.user._id.toString());
  const isOwner = chat.groupAdmin.toString() === req.user._id.toString();
  if (!isAdmin && !isOwner) { res.status(403); throw new Error('Only admins can remove members'); }

  chat.users = chat.users.filter(u => u.toString() !== userId);
  chat.admins = chat.admins.filter(a => a.toString() !== userId);
  await chat.save();

  const updated = await Chat.findById(chat._id).populate('users', '-password -securityKey');
  res.status(200).json({ success: true, chat: updated });
});

// @desc  Promote to admin
// @route PUT /api/chats/group/:id/promote
// @access Private
const promoteToAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const chat = await Chat.findById(req.params.id);
  if (!chat) { res.status(404); throw new Error('Group not found'); }
  if (chat.groupAdmin.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error('Only the owner can promote admins');
  }
  if (!chat.admins.includes(userId)) chat.admins.push(userId);
  await chat.save();
  res.status(200).json({ success: true, message: 'User promoted to admin' });
});

// @desc  Leave group
// @route PUT /api/chats/group/:id/leave
// @access Private
const leaveGroup = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) { res.status(404); throw new Error('Group not found'); }

  chat.users = chat.users.filter(u => u.toString() !== req.user._id.toString());
  chat.admins = chat.admins.filter(a => a.toString() !== req.user._id.toString());

  // Transfer ownership if owner leaves
  if (chat.groupAdmin.toString() === req.user._id.toString() && chat.users.length > 0) {
    chat.groupAdmin = chat.users[0];
    if (!chat.admins.includes(chat.users[0])) chat.admins.push(chat.users[0]);
  }

  await chat.save();
  res.status(200).json({ success: true, message: 'Left group' });
});

// @desc  Pin / unpin a chat
// @route PUT /api/chats/:id/pin
// @access Private
const togglePinChat = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const isPinned = user.pinnedChats.includes(req.params.id);

  if (isPinned) {
    user.pinnedChats = user.pinnedChats.filter(c => c.toString() !== req.params.id);
  } else {
    if (user.pinnedChats.length >= 3) {
      res.status(400); throw new Error('Cannot pin more than 3 chats');
    }
    user.pinnedChats.push(req.params.id);
  }

  await user.save();
  res.status(200).json({ success: true, isPinned: !isPinned });
});

// @desc  Archive / unarchive a chat
// @route PUT /api/chats/:id/archive
// @access Private
const toggleArchiveChat = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const isArchived = user.archivedChats.includes(req.params.id);

  if (isArchived) {
    user.archivedChats = user.archivedChats.filter(c => c.toString() !== req.params.id);
  } else {
    user.archivedChats.push(req.params.id);
  }

  await user.save();
  res.status(200).json({ success: true, isArchived: !isArchived });
});

// @desc  Search public groups/communities
// @route GET /api/chats/search/public
// @access Private
const searchPublicChats = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const chats = await Chat.find({
    isPublic: true,
    chatName: { $regex: q || '', $options: 'i' },
  }).populate('groupAdmin', 'username displayName profilePicture').limit(20);

  res.status(200).json({ success: true, chats });
});

module.exports = {
  accessChat, getChats, createGroupChat, updateGroup, addToGroup,
  removeFromGroup, promoteToAdmin, leaveGroup, togglePinChat,
  toggleArchiveChat, searchPublicChats,
};
