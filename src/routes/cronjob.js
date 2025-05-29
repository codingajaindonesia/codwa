const cron = require('node-cron');
const pool = require('../config/database');
const { phoneNumberFormatter } = require('../helpers/formatter.helper')

const {
    clients,
} = require('../services/whatsapp.services');
// Jalankan setiap menit (atur sesuai kebutuhan)
cron.schedule('* * * * *', async () => {
  console.log('Cronjob running...');

  try {
    // Ambil pesan waiting yang belum dikirim
    const [queues] = await pool.query(`
      SELECT * FROM queues INNER JOIN broadcasts ON queues.broadcast_id = broadcasts.id
      WHERE status = 'waiting'
      LIMIT 10
    `);

    for (const queue of queues) {
      try {

        const [client] = await pool.query(`SELECT client_id FROM clients WHERE id = (SELECT client_id FROM broadcasts WHERE id = (SELECT broadcast_id FROM queues WHERE id = ?))`, [queue.id]);

        console.log(client);

        // Kirim pesan (ganti dengan logika WhatsApp/Telegram/email kamu)
        const whatsapp = clients.get(client[0].client_id);
        if (!whatsapp) {
            return res.status(404).json({ error: 'Client not found or not initialized' });
        }
        console.log(phoneNumberFormatter(queue.phone));
        const response = await whatsapp.sendMessage(phoneNumberFormatter(queue.phone), queue.caption);
        console.log(response);
        
        if(response){

            await pool.query(`UPDATE queues SET status = 'sent', response=? WHERE id = ?`, [response._data,queue.id]);
        }else{
            await pool.query(`UPDATE queues SET status = 'sent', response=? WHERE id = ?`, [response._data,queue.id]);

        }
        // Tandai sebagai sent

        console.log(`✅ Sent to ${queue.phone}`);
      } catch (err) {
        console.error(`❌ Failed to send to ${queue.phone}:`, err.message);

        // Tandai sebagai failed
        await pool.query(`UPDATE queues SET status = 'failed' WHERE id = ?`, [queue.id]);
      }
    }

  } catch (err) {
    console.error('Cron error:', err.message);
  }
});
