# POS_WebApp

Web point-of-sale for a drink shop, built with Express, EJS, and PostgreSQL. Deployed on Render.

## Features

- Browse drinks by category, loaded from the `menuitem` table
- Customize sugar, ice, and paid add-ons for each drink
- Review the cart and change quantities at checkout
- Place an order, which saves it to the `orders` and `orderdetail` tables and shows the order number
- Recent orders page at `/orders` listing the latest 25 orders with their drinks and totals
- Manager page at `/manager` to change drink prices and mark drinks sold out; sold-out drinks show greyed out on the menu and can't be ordered
- Team members page at `/team_members`

## Running locally

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in the database connection values.
3. Start the server:
   ```
   npm start
   ```
   or `npm run dev` to restart automatically when files change.
4. Open http://localhost:3000.

## Environment variables

| Variable | Description |
| --- | --- |
| `PSQL_HOST` | Database host |
| `PSQL_PORT` | Database port |
| `PSQL_DATABASE` | Database name |
| `PSQL_USER` | Database user |
| `PSQL_PASSWORD` | Database password |
| `PORT` | Port for the web server (optional, defaults to 3000) |

On Render, set these in the service's Environment settings rather than committing a `.env` file.
