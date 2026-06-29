const bcrypt = require('bcryptjs');

module.exports = function(express, db) {
    const router = express.Router();

    router.post('/', async (req, res) => {
        try {
            const { name, username, email, password } = req.body;

            const pool = db.getPool();
            const conn = await pool.getConnection();

            const [existingEmail] = await conn.query(
                'SELECT * FROM users WHERE email = ?', [email]
            );
            if (existingEmail.length > 0) {
                conn.release();
                return res.json({ status: 'NOT OK', description: 'Email već postoji' });
            }

            const [existingUsername] = await conn.query(
                'SELECT * FROM users WHERE username = ?', [username]
            );
            if (existingUsername.length > 0) {
                conn.release();
                return res.json({ status: 'NOT OK', description: 'Username već postoji' });
            }

            const hashedPassword = bcrypt.hashSync(password, 10);

            await conn.query(
                'INSERT INTO users (name, username, email, password) VALUES (?, ?, ?, ?)',
                [name, username, email, hashedPassword]
            );

            conn.release();
            res.json({ status: 'OK', description: 'Registracija uspješna!' });

        } catch (e) {
            console.log(e);
            res.json({ code: 100, status: 'Error with query' });
        }
    });

    return router;
};