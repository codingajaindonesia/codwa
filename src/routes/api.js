const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');
const seederUser = require('../seeders/user.seeder');
const { ensureAuthenticated } = require('../middlewares/auth.middleware');

router.post('/send-message',ensureAuthenticated, whatsappController.sendMessage);
router.post('/send-media',ensureAuthenticated, whatsappController.sendMedia);
router.post('/client', whatsappController.createClient);
router.get('/seeder', seederUser.storeUser);
router.delete('/logout/:clientId', whatsappController.logoutClient);
router.delete('/delete/:clientId', whatsappController.deleteClient);

module.exports = router;