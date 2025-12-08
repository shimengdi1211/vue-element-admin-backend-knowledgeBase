const express = require('express');
const router = express.Router();
const { chatWithAI } = require('../controllers/chatControllers');

// 智能客服对话
router.post('/', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const reply = await chatWithAI(message, sessionId);
    res.json({ success: true, reply });
  } catch (error) {
    console.error('聊天错误:', error);
    res.status(500).json({ 
      success: false, 
      error: '智能客服暂时不可用' 
    });
  }
});
// router.get('/', async (req, res) => {
//   try {
//     // const { message, sessionId } = req.body;
//     console.log(req)
//     const reply = await chatWithAI(message, sessionId);
//     res.json({ success: true, reply });
//   } catch (error) {
//     console.error('聊天错误:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: '智能客服暂时不可用' 
//     });
//   }
// });
module.exports = router;