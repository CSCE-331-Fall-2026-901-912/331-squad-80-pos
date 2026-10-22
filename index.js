const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

// Create express app
const app = express();
const port = process.env.PORT || 3000;

// Set up view engine
app.set("view engine", "ejs");

// Create database pool
const pool = new Pool({
    user: process.env.PSQL_USER,
    host: process.env.PSQL_HOST,
    database: process.env.PSQL_DATABASE,
    password: process.env.PSQL_PASSWORD,
    port: process.env.PSQL_PORT,
    ssl: { rejectUnauthorized: false }
});

// Add process hook to gracefully shutdown pool
process.on('SIGINT', function() {
    pool.end();
    console.log('Application successfully shutdown');
    process.exit(0);
});

// Routes
app.get('/', (req, res) => {
    const data = { name: 'Mario' };
    res.render('index', data);
});

app.get('/user', async (req, res) => {
    try {
        const query_res = await pool.query('SELECT * FROM teammembers;');
        
        const data = { teammembers: query_res.rows };
        console.log(query_res.rows); // This prints your rows in the terminal
        
        res.render('user', data);
    } catch (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Server error retrieving data from database.');
    }
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
