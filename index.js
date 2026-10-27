const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

// Create express app
const app = express();
const port = process.env.PORT || 3000;

// Set up view engine and static files directory
app.set("view engine", "ejs");
app.use(express.static('public'));

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
app.get('/', async (req, res) => {
    try {
        const query_res = await pool.query('SELECT * FROM menuitem ORDER BY menu_item_id;');
        const items = query_res.rows;
        
        // Extract unique, non-null categories from the database items
        const categories = [...new Set(items.map(item => item.category).filter(Boolean))];
        
        const data = { 
            name: 'Mario', 
            items: items,
            categories: categories // <-- This property must be present!
        };
        
        res.render('index', data);
    } catch (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Server error retrieving menu items from database.');
    }
});

// Team Members Page
app.get('/user', async (req, res) => {
    try {
        const query_res = await pool.query('SELECT * FROM teammembers;');
        
        const data = { teammembers: query_res.rows };
        console.log(query_res.rows);
        
        res.render('user', data);
    } catch (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Server error retrieving data from database.');
    }
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});