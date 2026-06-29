
require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;  
const db = require('./db');
const cors = require('cors');

app.use(cors({
    origin: '*',  
    credentials: true
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('./app/public/browser'));
app.use(express.static('./app/public'));
app.use('/assets', express.static('./app/public/assets'));

const authRouter = require('./authenticate')(express, db);
app.use('/authenticate', authRouter);

const registerRouter = require('./register')(express, db);
app.use('/register', registerRouter);

const apiRouter = require('./api')(express, db);
app.use('/', apiRouter);

app.listen(port, () =>
    console.log(`Server radi na http://localhost:${port}`)
);