const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const path = require('path');

const { ensureAuthenticated } = require('../middlewares/auth.middleware');

const authController = require('../controllers/auth.controller');
const {
  createClient,
  getQrEmitter,
  initClientsFromDB,
  logoutClient
} = require('../services/whatsapp.services');

// load clients saat pertama kali
initClientsFromDB();

// Home page
router.get('/', ensureAuthenticated, async (req, res) => {
  res.render('contents/dashboard', { 
      baseUrl: req.protocol + '://' + req.get('host')
  });
});

router.get('/devices', ensureAuthenticated, async (req, res) => {
  const [clients] = await pool.query('SELECT * FROM clients');
  res.render('contents/devices', { 
      baseUrl: req.protocol + '://' + req.get('host'),
      clients
  });
});
router.get('/broadcast', ensureAuthenticated, async (req, res) => {
  // Ambil daftar klien berdasarkan user_id
  const [clients] = await pool.query('SELECT * FROM clients where user_id = ?', [ req.user.id]);
  res.render('contents/broadcast/index', { 
      baseUrl: req.protocol + '://' + req.get('host'),
      clients
  });
});
router.get('/messages/:uuid', ensureAuthenticated, async (req, res) => {
  // get oranater uuid

  const client = await pool.query("SELECT * FROM clients where uuid = ?" , [req.params])
  console.log(client[0]);
  res.render('contents/broadcast/message', { 
      baseUrl: req.protocol + '://' + req.get('host'),
      client: client[0]
  });
});




//Phonebook
router.get('/contact', ensureAuthenticated, async (req, res) => {
  res.render('contents/contact/category', { 
      baseUrl: req.protocol + '://' + req.get('host'),
      clients
  });
});

router.get('/contact', ensureAuthenticated, async (req, res) => {
  res.render('contents/contact/category', { 
      baseUrl: req.protocol + '://' + req.get('host'),
      clients
  });
});






router.get('/scan', ensureAuthenticated,async (req, res) => {
  const [clients] = await pool.query('SELECT * FROM clients');
  res.render('index', { clients });
});

// Create client
router.post('/create-client', async (req, res) => {
  const { clientId } = req.body;
  await pool.query('INSERT IGNORE INTO clients (client_id) VALUES (?)', [clientId]);
  await createClient(clientId);
  res.redirect('/');
});
// Logout client
router.post('/logout-client', async (req, res) => {
  const { clientId } = req.body;
  await logoutClient(clientId);
  res.redirect('/');
});

// QR Stream SSE
router.get('/qr/:clientId', async (req, res) => {
  const { clientId } = req.params;
  await createClient(clientId);

  const qrEmitter = getQrEmitter(clientId);
  if (!qrEmitter) return res.status(404).send('QR emitter not initialized');

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const sendQr = (qr) => res.write(`data: ${qr}\n\n`);
  qrEmitter.on('qr', sendQr);
  req.on('close', () => qrEmitter.off('qr', sendQr));
});

router.get('/login', authController.showLogin);
router.post('/login', authController.login);
router.get('/logout', authController.logout);


// router.get('/download/:filename', (req, res) => {
//   const filename = req.params.filename;
//   const filePath = path.join(__dirname, '../../public/downloads', filename);

//   res.sendFile(filePath, (err) => {
//     if (err) {
//       console.error('View error:', err);
//       res.status(404).send('File not found');
//     }
//   });
// });


module.exports = router;
