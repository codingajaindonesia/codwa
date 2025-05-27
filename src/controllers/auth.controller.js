const pool = require('../config/database');
const bcrypt = require('bcrypt');
const session = require('express-session');

exports.showLogin = (req, res) => {
  res.render('login', { error: null });
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

    if (rows.length === 0) {
      return res.render('login', { error: 'Username tidak ditemukan' });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.render('login', { error: 'Password salah' });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
    };

    res.redirect('/'); // arahkan ke halaman utama
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Terjadi kesalahan server' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};
