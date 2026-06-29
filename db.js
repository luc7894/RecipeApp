const mysql = require('mysql2/promise');

function getPool() {
    const pool = mysql.createPool({
        host: 'localhost',
        port: 3307,
        user: 'root',
        password: '',
        database: 'recepti_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    return pool;
}

module.exports = { getPool };