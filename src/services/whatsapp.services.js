const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const EventEmitter = require('events');
const {saveMediaToDownload} = require('../helpers/media.helper');
const pool = require('../config/database');
const qrcode = require('qrcode');
const clients = new Map();
const qrEmitters = new Map();

async function createClient(clientId) {
    if (clients.has(clientId)) return;

    const client = new Client({
        authStrategy: new LocalAuth({clientId}),
        puppeteer: {
            executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser',
            headless: true,
            args: ['--no-sandbox']
        },
    });

    const qrEmitter = new EventEmitter();
    qrEmitters.set(clientId, qrEmitter);
    clients.set(clientId, client);

    client.on('qr', async (qr) => {
        console.log(`📲 QR code generated for ${clientId}`);
        const qrImage = await qrcode.toDataURL(qr);
        qrEmitter.emit('qr', qrImage);
    });

    client.on('ready', async () => {
        console.log(`Client ${clientId} is ready`);
        const info = await client.info;
        const isReady = true;
        await pool.query(
            'UPDATE clients SET phone_number = ?, device_name = ?, is_ready = ? WHERE client_id = ?',
            [info.me.user, info.pushname, isReady, clientId]
        );
        console.log(`✅ ${clientId} ready: ${info.pushname}`);
    });
    client.on('message', async  message => {
        console.log({
            clientId,
            body: message.body,
            from: message.from,
            to: message.to,
            author: message.author,
            deviceTYpe: message.deviceType,
            type: message.type,
            hasMedia: message.hasMedia,
            timestamp: message.timestamp
        });

        	// console.log(message);
  const extractedMessage = {
    ack: message.ack,
    from: message.from,
    to: message.to,
    author: message.author,
    type: message.type,
    body: message.body,
    fromMe: message.fromMe,
    hasMedia: message.hasMedia,
    timestamp: message.timestamp,
    deviceType: message.deviceType,
  };

    if (message.hasMedia) {
        try {
        // Download media and add it to the extracted message
        const mediaFile = await message.downloadMedia();
        console.log('Media downloaded:', mediaFile);
        extractedMessage.mediaFile = saveMediaToDownload(mediaFile, `${message.from}_${message.timestamp}`);
        console.log(extractedMessage.mediaFile);
        } catch (error) {
        console.error('Error downloading media:', error);
        }
    }
        await pool.query('INSERT IGNORE INTO messages (client_id,ack, chatId, `from`, `to`, `type`, body, fromMe, attachmentType,attachmentLink,deviceType, timestamp, isRead) VALUES (?,?, ?, ?, ?,  ?, ?, ?, ?,?,?, ?, ?)',
             [clientId, message.ack, message.author, message.from, message.to, message.type, message.body, message.fromMe, extractedMessage.mediaFile ? extractedMessage.mediaFile.mimetype : null, extractedMessage.mediaFile ? extractedMessage.mediaFile.url : null, message.deviceType, message.timestamp * 1000, message.isRead]);

     
    });
    client.initialize();
    console.log(`Client ${clientId} initialized`);
}

// Contoh fungsi tambah client
function addClient(clientId, clientInstance) {
    clients.set(clientId, clientInstance);
}

// Contoh fungsi hapus client
async function logoutClient(clientId) {
    const client = clients.get(clientId);
    if (client) {
        client.logout();
        clients.delete(clientId);
        qrEmitters.delete(clientId);
    }
}

async function initClientsFromDB() {
    console.log('Initializing clients from DB...');
    const [rows] = await pool.query('SELECT client_id FROM clients');
    rows.forEach(row => createClient(row.client_id));
}
function getClient(clientId) {
    return clients.get(clientId);
}


function getQrEmitter(clientId) {
    return qrEmitters.get(clientId);
}

async function removeClient(clientId) {
    logoutClient(clientId);
    await pool.query('DELETE FROM clients WHERE client_id = ?', [clientId]);
}

module.exports = {
    clients,
    getClient,
    createClient,
    getQrEmitter,
    addClient,
    removeClient,
    logoutClient,
    initClientsFromDB,
    MessageMedia,
};
