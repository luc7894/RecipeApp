




module.exports = function(express, db) {
    const router = express.Router();
    const jwt = require('jsonwebtoken');
    const SECRET = 'recepti_tajni_kljuc_neda_github';
    const fs = require('fs');

    const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const dir = './app/public/assets/img/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true }); 
        }
        cb(null, dir);
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

    function verifyToken(req, res, next) {
        const token = req.headers['authorization'];
        if (!token) return res.json({ status: 'NOT OK', description: 'Nema tokena' });
        
        try {
            const decoded = jwt.verify(token, SECRET);
            req.user = decoded;
            next();
        } catch (e) {
            return res.json({ status: 'NOT OK', description: 'Nevažeći token' });
        }
    }



function verifyAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.json({ status: 'NOT OK', description: 'Nemate admin ovlasti' });
    }
    next();
}

async function verifyRecipeOwner(req, res, next) {
    try {
        const pool = db.getPool();
        const conn = await pool.getConnection();
        const [recipes] = await conn.query(
            'SELECT user_id FROM recipes WHERE id = ?', [req.params.id]
        );
        conn.release();

        if (recipes.length === 0) {
            return res.json({ status: 'NOT OK', description: 'Recept ne postoji' });
        }

        if (recipes[0].user_id !== req.user.id) {
            return res.json({ status: 'NOT OK', description: 'Nemate ovlasti za ovaj recept' });
        }

        next();
    } catch (e) {
        console.log(e);
        res.json({ code: 100, status: 'Error with query' });
    }
}

    router.post('/upload', verifyToken, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.json({ status: 'NOT OK', description: 'Nema slike' });
    }
    const imageUrl = `/assets/img/${req.file.filename}`;
    res.json({ status: 'OK', imageUrl });
});

    //  cat

    router.get('/categories', async (req, res) => {
        try {
            const pool = db.getPool();
            const conn = await pool.getConnection();
            const [categories] = await conn.query('SELECT * FROM categories');
            conn.release();
            res.json({ status: 'OK', categories });
        } catch (e) {
            console.log(e);
            res.json({ code: 100, status: 'Error with query' });
        }
    });

    router.post('/categories', verifyToken, async (req, res) => {
        try {
            const { name, description } = req.body;
            const pool = db.getPool();
            const conn = await pool.getConnection();
            await conn.query(
                'INSERT INTO categories (name, description) VALUES (?, ?)',
                [name, description]
            );
            conn.release();
            res.json({ status: 'OK', description: 'Kategorija dodana!' });
        } catch (e) {
            console.log(e);
            res.json({ code: 100, status: 'Error with query' });
        }
    });

    // r

    router.get('/recipes', async (req, res) => {
        try {
            const pool = db.getPool();
            const conn = await pool.getConnection();
            const [recipes] = await conn.query(`
                SELECT r.*, c.name as category_name, u.name as author_name 
                FROM recipes r
                LEFT JOIN categories c ON r.category_id = c.id
                LEFT JOIN users u ON r.user_id = u.id
            `);
            conn.release();
            res.json({ status: 'OK', recipes });
        } catch (e) {
            console.log(e);
            res.json({ code: 100, status: 'Error with query' });
        }
    });

    router.get('/comments/user/:user_id', async (req, res) => {
    try {
        const pool = db.getPool();
        const conn = await pool.getConnection();
        const [comments] = await conn.query(`
            SELECT c.*, r.title as recipe_title
            FROM comments c
            LEFT JOIN recipes r ON c.recipe_id = r.id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
        `, [req.params.user_id]);
        conn.release();
        res.json({ status: 'OK', comments });
    } catch (e) {
        console.log(e);
        res.json({ code: 100, status: 'Error with query' });
    }
});

    router.get('/recipes/:id', async (req, res) => {
        try {
            const pool = db.getPool();
            const conn = await pool.getConnection();
            const [recipes] = await conn.query(`
                SELECT r.*, c.name as category_name, u.name as author_name 
                FROM recipes r
                LEFT JOIN categories c ON r.category_id = c.id
                LEFT JOIN users u ON r.user_id = u.id
                WHERE r.id = ?
            `, [req.params.id]);

            const [ingredients] = await conn.query(
                'SELECT * FROM ingredients WHERE recipe_id = ?', [req.params.id]
            );

            conn.release();

            if (recipes.length === 0) {
                return res.json({ status: 'NOT OK', description: 'Recept ne postoji' });
            }

            res.json({ status: 'OK', recipe: recipes[0], ingredients });
        } catch (e) {
            console.log(e);
            res.json({ code: 100, status: 'Error with query' });
        }
    });

    //ovaj radi probleme

   router.post('/recipes', verifyToken, async (req, res) => {
    try {
        const { title, description, instructions, image_url, prep_time, category_id } = req.body;
        const pool = db.getPool();
        const conn = await pool.getConnection();
        const [result] = await conn.query(
            'INSERT INTO recipes (title, description, instructions, image_url, prep_time, category_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [title, description, instructions, image_url, prep_time, category_id, req.user.id]
        );
        conn.release();
        res.json({ status: 'OK', description: 'Recept dodan!', id: result.insertId });
    } catch (e) {
        console.log(e);
        res.json({ code: 100, status: 'Error with query' });
    }
});

    router.put('/recipes/:id', verifyToken, async (req, res) => {
    try {
        const { title, description, instructions, image_url, prep_time, category_id } = req.body;
        const pool = db.getPool();
        const conn = await pool.getConnection();

        if (image_url) {
            await conn.query(
                'UPDATE recipes SET title=?, description=?, instructions=?, image_url=?, prep_time=?, category_id=? WHERE id=?',
                [title, description, instructions, image_url, prep_time, category_id, req.params.id]
            );
        } else {
            await conn.query(
                'UPDATE recipes SET title=?, description=?, instructions=?, prep_time=?, category_id=? WHERE id=?',
                [title, description, instructions, prep_time, category_id, req.params.id]
            );
        }

        conn.release();
        res.json({ status: 'OK', description: 'Recept azuriran!' });
    } catch (e) {
        console.log(e);
        res.json({ code: 100, status: 'Error with query' });
    }
    });

    router.delete('/recipes/:id', verifyToken, async (req, res) => {
        try {
            const pool = db.getPool();
            const conn = await pool.getConnection();
            await conn.query('DELETE FROM ingredients WHERE recipe_id = ?', [req.params.id]);
            await conn.query('DELETE FROM comments WHERE recipe_id = ?', [req.params.id]);
            await conn.query('DELETE FROM recipes WHERE id = ?', [req.params.id]);
            conn.release();
            res.json({ status: 'OK', description: 'Recept obrisan!' });
        } catch (e) {
            console.log(e);
            res.json({ code: 100, status: 'Error with query' });
        }
    });

    //
    router.get('/comments/:recipe_id', async (req, res) => {
        try {
            const pool = db.getPool();
            const conn = await pool.getConnection();
            const [comments] = await conn.query(`
                SELECT c.*, u.name as author_name 
                FROM comments c
                LEFT JOIN users u ON c.user_id = u.id
                WHERE c.recipe_id = ?
                ORDER BY c.created_at DESC
            `, [req.params.recipe_id]);
            conn.release();
            res.json({ status: 'OK', comments });
        } catch (e) {
            console.log(e);
            res.json({ code: 100, status: 'Error with query' });
        }
    });

    router.post('/comments', verifyToken, async (req, res) => {
    try {
        const { text, recipe_id, rating } = req.body;
        const pool = db.getPool();
        const conn = await pool.getConnection();
        await conn.query(
            'INSERT INTO comments (text, rating, user_id, recipe_id) VALUES (?, ?, ?, ?)',
            [text, rating || null, req.user.id, recipe_id]
        );
        conn.release();
        res.json({ status: 'OK', description: 'Komentar dodan!' });
    } catch (e) {
        console.log(e);
        res.json({ code: 100, status: 'Error with query' });
    }
});

    router.delete('/comments/:id', verifyToken, async (req, res) => {
        try {
            const pool = db.getPool();
            const conn = await pool.getConnection();
            await conn.query('DELETE FROM comments WHERE id = ?', [req.params.id]);
            conn.release();
            res.json({ status: 'OK', description: 'Komentar obrisan!' });
        } catch (e) {
            console.log(e);
            res.json({ code: 100, status: 'Error with query' });
        }
    });

    // 

    router.get('/users', verifyToken, async (req, res) => {
        try {
            const pool = db.getPool();
            const conn = await pool.getConnection();
            const [users] = await conn.query('SELECT id, name, email, role FROM users');
            conn.release();
            res.json({ status: 'OK', users });
        } catch (e) {
            console.log(e);
            res.json({ code: 100, status: 'Error with query' });
        }
    });



    // ing

    router.get('/ingredients', async (req, res) => {
    try {
        const pool = db.getPool();
        const conn = await pool.getConnection();
        const [ingredients] = await conn.query(`
            SELECT i.*, r.title as recipe_title 
            FROM ingredients i
            LEFT JOIN recipes r ON i.recipe_id = r.id
            ORDER BY r.title, i.name
        `);
        conn.release();
        res.json({ status: 'OK', ingredients });
    } catch (e) {
        console.log(e);
        res.json({ code: 100, status: 'Error with query' });
    }
});

router.get('/ingredients/:recipe_id', async (req, res) => {
    try {
        const pool = db.getPool();
        const conn = await pool.getConnection();
        const [ingredients] = await conn.query(
            'SELECT * FROM ingredients WHERE recipe_id = ?', [req.params.recipe_id]
        );
        conn.release();
        res.json({ status: 'OK', ingredients });
    } catch (e) {
        console.log(e);
        res.json({ code: 100, status: 'Error with query' });
    }
});

router.post('/ingredients', verifyToken, async (req, res) => {
    try {
        const { name, quantity, recipe_id } = req.body;
        const pool = db.getPool();
        const conn = await pool.getConnection();
        await conn.query(
            'INSERT INTO ingredients (name, quantity, recipe_id) VALUES (?, ?, ?)',
            [name, quantity, recipe_id]
        );
        conn.release();
        res.json({ status: 'OK', description: 'Sastojak dodan!' });
    } catch (e) {
        console.log(e);
        res.json({ code: 100, status: 'Error with query' });
    }
});

router.delete('/ingredients/:id', verifyToken, async (req, res) => {
    try {
        const pool = db.getPool();
        const conn = await pool.getConnection();
        await conn.query('DELETE FROM ingredients WHERE id = ?', [req.params.id]);
        conn.release();
        res.json({ status: 'OK', description: 'Sastojak obrisan!' });
    } catch (e) {
        console.log(e);
        res.json({ code: 100, status: 'Error with query' });
    }
});

router.delete('/categories/:id', verifyToken, async (req, res) => {
    try {
        const pool = db.getPool();
        const conn = await pool.getConnection();
        await conn.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
        conn.release();
        res.json({ status: 'OK', description: 'Kategorija obrisana!' });
    } catch (e) {
        console.log(e);
        res.json({ code: 100, status: 'Error with query' });
    }
});





    return router;
};

