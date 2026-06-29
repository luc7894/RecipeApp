const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

module.exports = function(express, db) {
    const router = express.Router();
    const SECRET = 'recepti_tajni_kljuc_neda_github';

    router.get('/', (req, res) => {
        res.json({ message: 'Dobro došli na Auth API!' });
    });

    router.post('/', async (req, res) => {
        try {
            const pool = db.getPool();
            const conn = await pool.getConnection();

            const [rows] = await conn.query(
                'SELECT * FROM users WHERE username = ?', [req.body.username]
            );
            conn.release();

            if (rows.length === 0) {
                return res.json({ status: 'NOT OK', description: 'Username ne postoji' });
            }

            const user = rows[0];
            const passwordMatch = bcrypt.compareSync(req.body.password, user.password);

            if (passwordMatch) {
                const token = jwt.sign(
                    { id: user.id, username: user.username, role: user.role },
                    SECRET,
                    { expiresIn: '24h' }
                );
                res.json({ status: 'OK', user, token });
            } else {
                res.json({ status: 'NOT OK', description: 'Pogrešna lozinka' });
            }

        } catch (e) {
            console.log(e);
            res.json({ code: 100, status: 'Error with query' });
        }
    });

    return router;
};