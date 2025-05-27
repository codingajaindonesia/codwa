const fs = require('fs');
const path = require('path');


exports.saveMediaToDownload = function (media, filename) {
    if (!media || !media.data || !media.mimetype) {
        throw new Error('Invalid media object');
    }

    // Ekstensi dari mimetype (misalnya: image/jpeg -> .jpg)
    const extension = media.mimetype.split('/')[1];

    const fullFilename = `${filename}.${extension}`;
    // Path tempat menyimpan
    const filePath = path.join(__dirname, '../../public/downloads', fullFilename);

    // Pastikan folder 'downloads' ada
    if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    // Decode Base64 dan simpan file
    const buffer = Buffer.from(media.data, 'base64');
    fs.writeFileSync(filePath, buffer);

    return {
        url: `/downloads/${fullFilename}`, // Path relatif untuk digunakan di frontend
        mimetype: media.mimetype,
        filename: fullFilename
    } ; // Kembalikan path relatif untuk digunakan di frontend
}