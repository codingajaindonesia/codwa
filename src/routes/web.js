const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');

const upload = multer({ dest: 'uploads/' });
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



// ===== Router untuk mengelolad Kontak atau PHONEBOOK ======
router.get('/contact', ensureAuthenticated, async (req, res) => {
   const [clients] = await pool.query('SELECT * FROM clients where user_id = ?', [ req.user.id]);
   const [categories] = await pool.query('SELECT contacts.*, clients.phone_number, clients.device_name FROM contacts INNER JOIN clients on contacts.client_id = clients.id where clients.user_id = ?', [ req.user.id]);
    res.render('contents/contact/category', { 
      baseUrl: req.protocol + '://' + req.get('host'),
      clients,
      categories
  });
});
router.post('/contact', ensureAuthenticated, async (req, res) => {
  const { title, description, clientId } = req.body;
  const uuid = require('crypto').randomUUID();
    await pool.query('INSERT INTO contacts (title, description, uuid, client_id) VALUES (?, ?, ?, ?)', [title, description, uuid, clientId]);
    res.redirect('/contact');
  }
);
router.put('/contact/:uuid', ensureAuthenticated, async (req, res) => {
  const { uuid } = req.params;
  const { title, description, clientId } = req.body;

  try {
    const [response] = await pool.query('UPDATE contacts SET title = ?, description = ?, client_id = ? WHERE uuid = ?', [title, description, clientId, uuid]);

    if (response.affectedRows > 0) {
      res.status(200).json({ 
        status: true,
        message: 'Contact updated successfully' });
    } else {
      res.status(404).json({ 
        status: false,
        message: 'Contact not found' });
    }
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
);
router.delete('/contact/:uuid', ensureAuthenticated, async (req, res) => {
  const { uuid } = req.params;

  try {
    const [response] = await pool.query('DELETE FROM contacts WHERE uuid = ?', [uuid]);

    if (response.affectedRows > 0) {
      res.status(200).json({ 
        status : true,
        message: 'Contact deleted successfully' });
    } else {
      res.status(200).json({ 
        status: false,
        message: 'Contact not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/phonebook/:uuid', ensureAuthenticated, async (req, res) => {
  const [phonebooks] = await pool.query("SELECT * FROM contact_lists where contact_id = (SELECT id FROM contacts WHERE uuid = ?)", [req.params.uuid]);
  console.log(phonebooks);
  res.render('contents/contact/phonebook', { 
      baseUrl: req.protocol + '://' + req.get('host'),
      uuid: req.params.uuid,
      phonebooks
  });
});
router.delete('/reset-phonebook/:uuid', ensureAuthenticated, async (req, res) => {
  const { uuid } = req.params;
  try {
    const [response] = await pool.query('DELETE FROM contact_lists WHERE contact_id = (SELECT id FROM contacts WHERE uuid = ?)', [uuid]);
    if (response.affectedRows > 0) {
      res.status(200).json({ 
        status: true,
        message: 'Phonebook reset successfully' });
    }
    else {
      res.status(404).json({ 
        status: false,
        message: 'Phonebook not found' });
    }
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.delete('/delete-phonebook/:id', ensureAuthenticated, async (req, res) => {
  const { id } = req.params;
  try {
    const [response] = await pool.query('DELETE FROM contact_lists WHERE id = ?', [id]);
    if (response.affectedRows > 0) {
      res.status(200).json({ 
        status: true,
        message: 'Phonebook entry deleted successfully' });
    }
    else {
      res.status(404).json({
        status: false,
        message: 'Phonebook entry not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.post('/add-phonebook', ensureAuthenticated, async (req, res) => {
  const { phone, name, uuid } = req.body;
  const [contacts] = await pool.query('SELECT * FROM contacts WHERE uuid = ?', [uuid]);
  if (contacts.length > 0) {
    const contactId = contacts[0].id;
    const createdAt = new Date();

    //check if phone already exists
    const [existingContact] = await pool.query('SELECT * FROM contact_lists WHERE phone = ? AND contact_id = ?', [phone, contactId]);
    if (existingContact.length > 0) {
      res.status(200).json({
        status: false,
        message: 'Phone number already exists in this contact'
      });
    }else{
  await pool.query('INSERT INTO contact_lists (phone, name, contact_id, created_at) VALUES (?, ?, ?, ?)', [phone, name, contactId, createdAt])
      .catch(err => console.error('Error inserting contact:', err));

      res.status(200).json({
        status: true,
        message: 'Contact added successfully'
      });
    }


  } else {
    console.log('Contact not found');
    res.status(404).json({
      status: false,
      message: 'Contact not found'
    });
  }
});
router.post('/import-phonebook',  upload.single('excelFile'), ensureAuthenticated, async (req, res) => {
   const workbook = XLSX.readFile(req.file.path);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  const { uuid } = req.body;
  console.log(uuid);


  const [contacts] = await pool.query('SELECT * FROM contacts WHERE uuid = ?', [uuid]);

  if (contacts.length > 0) {
  const contactId = contacts[0].id;


  data.forEach( async element => {
    console.log(element);
    if(element){
      const { Hp, Nama } = element;
      if (Hp && Nama) {
        const createdAt = new Date();
       await pool.query('INSERT INTO contact_lists (phone, name, contact_id, created_at) VALUES (?, ?, ?,?)', [Hp, Nama, contactId, createdAt])
          .catch(err => console.error('Error inserting contact:', err));
      }
    }
  });
  } else {
  console.log('Contact not found');
}
  res.redirect('/phonebook/' + uuid);
});

// ===== End Router untuk mengelolad Kontak atau PHONEBOOK ======



// ========= ROuter untuk melakukan broadcast ======================


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
const uuid = req.params.uuid;
  const [broadcasts] = await pool.query("SELECT * FROM broadcasts where client_id = (SELECT id FROM clients WHERE uuid = ?)", [uuid]);
  res.render('contents/broadcast/message', { 
      baseUrl: req.protocol + '://' + req.get('host'),
      uuid,
      broadcasts
  });
});

router.post('/broadcast', ensureAuthenticated, async (req, res) => {
  const { title, message, uuid } = req.body;
  const attachment = req.files?.attachment;
  //cek mimetype attachment maksimal 10mb, type image png, jpg, jpeg, gif, mp3, docx, pdf, xlsx, xls, doc, pptx, ppt
  const allowedMimeTypes = [
    'image/png',
    'image/jpg',
    'image/jpeg',
    'image/gif',
    'audio/mpeg',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/msword', // doc
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-excel', // xls
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
    'application/vnd.ms-powerpoint' // ppt
  ];
  const maxFileSize = 10 * 1024 * 1024; // 10 MB
  if (attachment) {
    const file = attachment; // Assuming 'attachment' is the file object from the request
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid file type. Allowed types are: ' + allowedMimeTypes.join(', ')
      });
    }
    if (file.size > maxFileSize) {
      return res.status(400).json({
        status: false,
        message: 'File size exceeds the maximum limit of 10 MB'
      });
    }
    // Save the file to the server or process it as needed
    const filePath = path.join(__dirname, '../../public/uploads/'+uuid+'/', file.originalname);
    await file.mv(filePath, (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(500).json({
          status: false,
          message: 'File upload failed'
        });
      }
      console.log('File uploaded successfully:', filePath);
    });
  } else {
    console.log('No attachment provided');
  }
}
);



// ======== end ROuter untuk melakukan broadcast ======================







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
