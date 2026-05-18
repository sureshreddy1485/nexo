const asyncHandler = require('express-async-handler');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUpload');

const populateMessage = (query) =>
  query
    .populate('sender', 'username displayName profilePicture')
    .populate('replyTo')
    .populate('reactions.user', 'username displayName profilePicture')
    .populate({
      path: 'chat',
      populate: { path: 'users', select: 'username displayName profilePicture isOnline' },
    });

// @desc  Send a message
// @route POST /api/messages
// @access Private
const sendMessage = asyncHandler(async (req, res) => {
  const { chatId, content, replyTo, isSelfDestructing, destructAfterSeconds, isEncrypted, encryptedContent } = req.body;

  if (!chatId) { res.status(400); throw new Error('chatId is required'); }

  const chat = await Chat.findById(chatId);
  if (!chat) { res.status(404); throw new Error('Chat not found'); }
  if (!chat.users.includes(req.user._id)) { res.status(403); throw new Error('Not a member of this chat'); }

  let mediaUrl = '';
  let mediaPublicId = '';
  let mediaType = '';
  let messageType = 'text';
  let fileName = '';
  let fileSize = 0;

  if (req.file) {
    const mime = req.file.mimetype;
    let folder = 'messages';
    let resourceType = 'auto';

    if (mime.startsWith('image/')) { mediaType = 'image'; messageType = 'image'; folder = 'images'; }
    else if (mime.startsWith('video/')) { mediaType = 'video'; messageType = 'video'; folder = 'videos'; }
    else if (mime.startsWith('audio/')) { mediaType = 'audio'; messageType = mime.includes('webm') || mime.includes('ogg') ? 'voice' : 'audio'; folder = 'audio'; }
    else { mediaType = 'document'; messageType = 'document'; folder = 'documents'; }

    const result = await uploadToCloudinary(req.file.buffer, folder, resourceType);
    mediaUrl = result.secure_url;
    mediaPublicId = result.public_id;
    fileName = req.file.originalname;
    fileSize = req.file.size;
  }

  const msgData = {
    sender: req.user._id,
    chat: chatId,
    content: content || '',
    mediaUrl,
    mediaPublicId,
    mediaType,
    messageType,
    fileName,
    fileSize,
    replyTo: replyTo || null,
    isSelfDestructing: isSelfDestructing || false,
    isEncrypted: isEncrypted || false,
    encryptedContent: encryptedContent || '',
  };

  if (isSelfDestructing && destructAfterSeconds) {
    msgData.expiresAt = new Date(Date.now() + parseInt(destructAfterSeconds) * 1000);
  }

  let message = await Message.create(msgData);
  message = await populateMessage(Message.findById(message._id));

  // Update chat's latest message
  await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });

  // Emit via socket (handled in socket handler)
  const io = req.app.get('io');
  io.to(chatId).emit('new_message', message);

  res.status(201).json({ success: true, message });
});

// @desc  Get all messages in a chat
// @route GET /api/messages/:chatId
// @access Private
const getMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const chat = await Chat.findById(chatId);
  if (!chat) { res.status(404); throw new Error('Chat not found'); }
  if (!chat.users.includes(req.user._id)) { res.status(403); throw new Error('Not a member of this chat'); }

  const messages = await populateMessage(
    Message.find({ chat: chatId, deletedForEveryone: false })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
  );

  // Mark as read
  await Message.updateMany(
    { chat: chatId, readBy: { $ne: req.user._id }, sender: { $ne: req.user._id } },
    { $push: { readBy: req.user._id } }
  );

  res.status(200).json({ success: true, messages: messages.reverse(), page: parseInt(page) });
});

// @desc  Mark messages as read
// @route PUT /api/messages/:chatId/read
// @access Private
const markAsRead = asyncHandler(async (req, res) => {
  await Message.updateMany(
    { chat: req.params.chatId, readBy: { $ne: req.user._id }, sender: { $ne: req.user._id } },
    { $push: { readBy: req.user._id } }
  );
  const io = req.app.get('io');
  io.to(req.params.chatId).emit('messages_read', { chatId: req.params.chatId, userId: req.user._id });
  res.status(200).json({ success: true });
});

// @desc  Delete message for everyone
// @route DELETE /api/messages/:id
// @access Private
const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);
  if (!message) { res.status(404); throw new Error('Message not found'); }
  if (message.sender.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error('Only the sender can delete for everyone');
  }

  message.deletedForEveryone = true;
  message.content = '';
  message.mediaUrl = '';
  if (message.mediaPublicId) {
    await deleteFromCloudinary(message.mediaPublicId, message.mediaType === 'image' ? 'image' : 'video');
  }
  await message.save();

  const io = req.app.get('io');
  io.to(message.chat.toString()).emit('message_deleted', { messageId: message._id, chatId: message.chat });

  res.status(200).json({ success: true, message: 'Message deleted for everyone' });
});

// @desc  Add/toggle reaction on a message
// @route POST /api/messages/:id/react
// @access Private
const reactToMessage = asyncHandler(async (req, res) => {
  const { emoji } = req.body;
  const message = await Message.findById(req.params.id);
  if (!message) { res.status(404); throw new Error('Message not found'); }

  const existingIndex = message.reactions.findIndex(
    r => r.user.toString() === req.user._id.toString()
  );

  if (existingIndex !== -1) {
    if (message.reactions[existingIndex].emoji === emoji) {
      // Remove reaction (toggle off)
      message.reactions.splice(existingIndex, 1);
    } else {
      // Change reaction
      message.reactions[existingIndex].emoji = emoji;
    }
  } else {
    message.reactions.push({ user: req.user._id, emoji });
  }

  await message.save();
  const updated = await populateMessage(Message.findById(message._id));

  const io = req.app.get('io');
  io.to(message.chat.toString()).emit('reaction_updated', { messageId: message._id, reactions: updated.reactions, chatId: message.chat });

  res.status(200).json({ success: true, reactions: updated.reactions });
});

// @desc  Forward a message
// @route POST /api/messages/:id/forward
// @access Private
const forwardMessage = asyncHandler(async (req, res) => {
  const { chatIds } = req.body;
  const original = await Message.findById(req.params.id);
  if (!original) { res.status(404); throw new Error('Message not found'); }

  const forwarded = await Promise.all(
    chatIds.map(chatId =>
      Message.create({
        sender: req.user._id,
        chat: chatId,
        content: original.content,
        mediaUrl: original.mediaUrl,
        mediaType: original.mediaType,
        messageType: original.messageType,
        isForwarded: true,
        forwardedFrom: original.sender,
      })
    )
  );

  const io = req.app.get('io');
  for (const msg of forwarded) {
    const populated = await populateMessage(Message.findById(msg._id));
    io.to(msg.chat.toString()).emit('new_message', populated);
    await Chat.findByIdAndUpdate(msg.chat, { latestMessage: msg._id });
  }

  res.status(201).json({ success: true, message: 'Message forwarded' });
});

// @desc  Save message to saved messages
// @route POST /api/messages/:id/save
// @access Private
const saveMessage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const isSaved = user.savedMessages.includes(req.params.id);
  if (isSaved) {
    user.savedMessages = user.savedMessages.filter(m => m.toString() !== req.params.id);
  } else {
    user.savedMessages.push(req.params.id);
  }
  await user.save();
  res.status(200).json({ success: true, isSaved: !isSaved });
});

// @desc  Get saved messages
// @route GET /api/messages/saved
// @access Private
const getSavedMessages = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'savedMessages',
    populate: { path: 'sender', select: 'username displayName profilePicture' },
  });
  res.status(200).json({ success: true, messages: user.savedMessages });
});

module.exports = {
  sendMessage, getMessages, markAsRead, deleteMessage,
  reactToMessage, forwardMessage, saveMessage, getSavedMessages,
};
