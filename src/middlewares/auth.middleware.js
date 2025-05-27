const pool = require('../config/database');
const bcrypt = require('bcrypt');


exports.ensureAuthenticated = (req, res, next) => {
  const isApiRequest = req.originalUrl.startsWith('/api');

  if (isApiRequest) {
    // Cek header Authorization Basic Auth
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing Basic Auth' });
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = atob(base64Credentials);
    const [username, password] = credentials.split(':');

    checkUserAuth(username, password)
      .then(user => {
        if (!user) {
          return res.status(401).json({ error: 'Unauthorized: Invalid credentials' });
        }
        req.user = user;
        next();
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
      });

  } else {
    // Web session check
    if (req.session && req.session.user) {
      req.user = req.session.user; // 🔥 Tambahkan ini
      return next();
    } else {
      return res.redirect('/login');
    }
  }
};
function checkUserAuth(username, password) {
  return pool.query('SELECT * FROM users WHERE username = ?', [username]) // ← tambahkan return
    .then(([rows]) => {
      if (rows.length === 0) {
        return null; // User not found
      }
      const user = rows[0];
      return bcrypt.compare(password, user.password)
        .then(passwordMatch => {
          if (passwordMatch) {
            return { id: user.id, username: user.username }; // Return user object
          } else {
            return null; // Invalid password
          }
        });
    })
    .catch(err => {
      console.error(err);
      throw err; // Rethrow error for handling in middleware
    });
}
