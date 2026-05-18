const express = require('express');
const router = express.Router();
const {
  searchUsers, getUserProfile, updateProfile, sendFriendRequest,
  acceptFriendRequest, declineFriendRequest, blockUser, unblockUser,
  getFriendRequests, updateCameraStatus,
} = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.get('/search', protect, searchUsers);
router.get('/friend-requests', protect, getFriendRequests);
router.put('/profile', protect, upload.single('profilePicture'), updateProfile);
router.put('/camera-status', protect, updateCameraStatus);
router.get('/:username', protect, getUserProfile);
router.post('/:id/friend-request', protect, sendFriendRequest);
router.post('/:id/accept-request', protect, acceptFriendRequest);
router.post('/:id/decline-request', protect, declineFriendRequest);
router.post('/:id/block', protect, blockUser);
router.post('/:id/unblock', protect, unblockUser);

module.exports = router;
