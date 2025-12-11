const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatControllers');

// 智能客服对话
router.post('/',chatController.chatWithAI);
  //  async (req, res) => {
  // try {
  //   const { message, sessionId } = req.body;
  //   const reply = await chatWithAI(message, sessionId);
  //   res.json({ success: true, reply });
  // } catch (error) {
  //   console.error('聊天错误:', error);
  //   res.status(500).json({ 
  //     success: false, 
  //     error: '智能客服暂时不可用' 
  //   });
  // }
// }


router.post('/stream',chatController.chatStream);
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