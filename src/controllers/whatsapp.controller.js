const {
    clients,
    MessageMedia,
    logoutClient,
    createClient
} = require('../services/whatsapp.services');
const { phoneNumberFormatter } = require('../helpers/formatter.helper')
const pool = require('../config/database');


exports.sendMessage = async (req, res) => {
    try {
        const { clientId, to, message } = req.body;

        if (!clientId || !to || !message) {
            return res.status(400).json({ error: 'clientId, to, and message are required' });
        }

        const client = clients.get(clientId);
        if (!client) {
            return res.status(404).json({ error: 'Client not found or not initialized' });
        }
         console.log(to);
        console.log(phoneNumberFormatter(to));
        const response = await client.sendMessage(phoneNumberFormatter(to), message);

        // await client.sendMessage(phoneNumberFormatter(to), message);
        res.json({ status: true, message: 'Message sent', response: response });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send message' });
    }
}

exports.sendMedia = async (req, res) => {
    try {
        const { clientId, to, caption, url } = req.body;

        if (!clientId || !to) {
            return res.status(400).json({ error: 'clientId and to are required' });
        }


        const client = clients.get(clientId);
        if (!client) {
            return res.status(404).json({ error: 'Client not found or not initialized' });
        }

        // file.buffer berisi binary data
        // file.mimetype contoh: 'image/png', 'image/jpeg', dll
        const media = await MessageMedia.fromUrl(url);

        await client.sendMessage(phoneNumberFormatter(to), media, { caption: caption || '' });

        res.json({ status: true, message: 'Picture sent' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send picture', detail: err.message });
    }
}

exports.createClient = async (req, res) => {
    try {
         const { clientId } = req.body;
        await pool.query('INSERT IGNORE INTO clients (client_id) VALUES (?)', [clientId]);
        await createClient(clientId);
        res.status(200).json({ status: true, message: 'Client created' });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create client' });
        
    }
     
}
exports.deleteClient = async (req, res) => {
    console.log('delete client');
    try {
        const clientId = req.params.clientId;
  const client = clients.get(clientId);
  if (client) {
    await client.destroy();
    clients.delete(clientId);
  }
  // Hapus dari database juga
  await pool.query('DELETE FROM clients WHERE client_id = ?', [clientId]);
  res.json({ status: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete client' });
        
    }
 
}

exports.logoutClient = async (req, res) => {
 const clientId = req.params.clientId;
//   console.log('clientId', clientId);
  const client = clients.get(clientId);
  if (client) {
    await pool.query(
          'UPDATE clients SET  is_ready = ? WHERE client_id = ?',
          [ false, clientId ]
        );
    logoutClient(clientId); // hapus client dari memory
      

    res.json({ status: true });
  } else {
    res.status(404).json({ error: 'Client not found' });
  }
}