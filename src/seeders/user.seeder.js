// Jalankan 1x di script Node.js
const pool = require('../config/database');
const bcrypt = require('bcrypt');

exports.storeUser = async () => {
    try {
        const hashedPassword = await bcrypt.hash('asd', 10);
        await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hashedPassword]);
        console.log('Users seeded successfully');
    }
    catch (error) {
        console.error('Error seeding users:', error);
    }
    finally {
        pool.end();
    }
}