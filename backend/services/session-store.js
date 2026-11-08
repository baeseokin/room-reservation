const session = require('express-session');
const crypto = require('node:crypto');
const key = sid => crypto.createHash('sha256').update(sid).digest('hex');
class DatabaseSessionStore extends session.Store {
  constructor(pool) { super(); this.pool = pool; }
  get(sid, callback) {
    this.pool.query('SELECT data FROM auth_sessions WHERE id = ? AND expires_at > NOW()', [key(sid)])
      .then(([rows]) => callback(null, rows.length ? JSON.parse(rows[0].data) : null)).catch(callback);
  }
  set(sid, value, callback = () => {}) {
    const expires = new Date(value.cookie.expires || Date.now() + 1800000);
    this.pool.query('INSERT INTO auth_sessions (id, data, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), expires_at = VALUES(expires_at)', [key(sid), JSON.stringify(value), expires]).then(() => callback()).catch(callback);
  }
  destroy(sid, callback = () => {}) {
    this.pool.query('DELETE FROM auth_sessions WHERE id = ?', [key(sid)]).then(() => callback()).catch(callback);
  }
}
module.exports = DatabaseSessionStore;
