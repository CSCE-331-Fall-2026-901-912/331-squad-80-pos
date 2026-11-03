const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

// Create express app
const app = express();
const port = process.env.PORT || 3000;

// Set up view engine and static files directory
app.set("view engine", "ejs");
app.use(express.static('public'));
app.use(express.json());

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
            name: 'menu_items', 
            items: items,
            categories: categories, 
        };
        
        res.render('index', data);
    } catch (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Server error retrieving menu items from database.');
    }
});

app.get('/checkout', (req, res) => {
    res.render('checkout');
});

// Add-on prices in cents; keep in sync with ADD_ONS in public/js/client.js
const ADD_ON_PRICES = {
    'boba': 50,
    'grass-jelly': 50,
    'pudding': 50,
    'aloe-vera': 50,
    'lychee-jelly': 50,
    'coconut-jelly': 50,
    'crystal-boba': 50,
    'cheese-foam': 100
};
const GUEST_CUSTOMER_ID = 0;
const DEFAULT_EMPLOYEE_ID = 1;

// Place an order: prices are recomputed from the database, not trusted from the client
app.post('/api/orders', async (req, res) => {
    const lines = req.body?.items;
    if (!Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ error: 'Order has no items.' });
    }

    const parsed = [];
    for (const line of lines) {
        const menuItemId = Number(line?.id);
        const quantity = Number(line?.quantity);
        const addons = Array.isArray(line?.addons) ? line.addons : [];
        if (!Number.isInteger(menuItemId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99
            || !addons.every(id => Object.hasOwn(ADD_ON_PRICES, id))) {
            return res.status(400).json({ error: 'Order contains an invalid item.' });
        }
        const addonCents = [...new Set(addons)].reduce((sum, id) => sum + ADD_ON_PRICES[id], 0);
        parsed.push({ menuItemId, quantity, addonCents });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // IDs are not auto-generated, so serialize order creation while picking the next IDs
        await client.query('LOCK TABLE orders, orderdetail IN EXCLUSIVE MODE');

        const ids = [...new Set(parsed.map(line => line.menuItemId))];
        const priceRes = await client.query(
            'SELECT menu_item_id, current_price FROM menuitem WHERE menu_item_id = ANY($1) AND is_available = 1',
            [ids]
        );
        const baseCents = new Map(priceRes.rows.map(row => [row.menu_item_id, Math.round(Number(row.current_price) * 100)]));
        if (baseCents.size !== ids.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'An item in your order is no longer available.' });
        }

        const details = parsed.map(line => ({
            ...line,
            unitCents: baseCents.get(line.menuItemId) + line.addonCents
        }));
        const totalCents = details.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);

        const orderRes = await client.query(
            `INSERT INTO orders (order_id, customer_id, employee_id, total_cost)
             SELECT COALESCE(MAX(order_id), 0) + 1, $1, $2, $3 FROM orders
             RETURNING order_id`,
            [GUEST_CUSTOMER_ID, DEFAULT_EMPLOYEE_ID, totalCents / 100]
        );
        const orderId = orderRes.rows[0].order_id;

        for (const line of details) {
            await client.query(
                `INSERT INTO orderdetail (order_detail_id, order_id, menu_item_id, quantity, unit_price)
                 SELECT COALESCE(MAX(order_detail_id), 0) + 1, $1, $2, $3, $4 FROM orderdetail`,
                [orderId, line.menuItemId, line.quantity, line.unitCents / 100]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ orderId, totalCents });
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('Error placing order:', err);
        res.status(500).json({ error: 'Could not place your order. Please try again.' });
    } finally {
        client.release();
    }
});

// Recent Orders Page
app.get('/orders', async (req, res) => {
    try {
        const query_res = await pool.query(
            `SELECT o.order_id, o.total_cost,
                    to_char(o.order_timestamp, 'Mon FMDD, YYYY FMHH12:MI AM') AS placed_at,
                    json_agg(json_build_object(
                        'name', m.name,
                        'quantity', d.quantity,
                        'unit_price', d.unit_price
                    ) ORDER BY d.order_detail_id) AS items
             FROM (SELECT * FROM orders ORDER BY order_id DESC LIMIT 25) o
             JOIN orderdetail d ON d.order_id = o.order_id
             JOIN menuitem m ON m.menu_item_id = d.menu_item_id
             GROUP BY o.order_id, o.order_timestamp, o.total_cost
             ORDER BY o.order_id DESC;`
        );

        res.render('orders', { orders: query_res.rows });
    } catch (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Server error retrieving orders from database.');
    }
});

// Team Members Page
app.get('/team_members', async (req, res) => {
    try {
        const query_res = await pool.query('SELECT * FROM teammembers;');
        
        const data = { teammembers: query_res.rows };
        
        res.render('team_members', data);
    } catch (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Server error retrieving data from database.');
    }
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
