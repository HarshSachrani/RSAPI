const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // serves everything in /public — this is your frontend

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// GET (READ) POST (Create) PUT (UPDATE) DELETE (Delete)

app.get('/', (req, res) => {
  try {
    res.json({ message: "WELCOME TO REAL ESTATE INVESTMENT & RENTAL YIELD ANALYTICS API" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GENERIC CRUD FUNCTION
// One function builds GET-all, GET-by-id, POST, PUT, DELETE
// for whatever table + primary key + columns we give it.
// This is the same pool.query pattern as before, just reused
// instead of copy-pasted 17 times.
// ============================================================
function registerCrudRoutes(routeName, tableName, idColumn, columns) {

  // GET all rows
  app.get(`/${routeName}`, async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${tableName} ORDER BY ${idColumn}`);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET one row by id
  app.get(`/${routeName}/:id`, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM ${tableName} WHERE ${idColumn} = $1`,
        [req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: `${tableName} record not found` });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST - create a new row
  app.post(`/${routeName}`, async (req, res) => {
    try {
      const values = columns.map(col => req.body[col]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const result = await pool.query(
        `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT - update an existing row
  app.put(`/${routeName}/:id`, async (req, res) => {
    try {
      const values = columns.map(col => req.body[col]);
      const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
      const result = await pool.query(
        `UPDATE ${tableName} SET ${setClause} WHERE ${idColumn} = $${columns.length + 1} RETURNING *`,
        [...values, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: `${tableName} record not found` });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE a row
  app.delete(`/${routeName}/:id`, async (req, res) => {
    try {
      const result = await pool.query(
        `DELETE FROM ${tableName} WHERE ${idColumn} = $1 RETURNING *`,
        [req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: `${tableName} record not found` });
      res.json({ message: `${tableName} record deleted`, deleted: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

// ============================================================
// REGISTER ALL 17 TABLES
// routeName, tableName, idColumn, [columns for POST/PUT]
// (id column and created_at/timestamps are excluded from
// the columns list since those are auto-generated)
// ============================================================
registerCrudRoutes('owners', 'owners', 'owner_id',
  ['name', 'email', 'phone', 'address']);

registerCrudRoutes('investors', 'investors', 'investor_id',
  ['name', 'email', 'phone', 'investor_type']);

registerCrudRoutes('properties', 'properties', 'property_id',
  ['owner_id', 'address', 'city', 'property_type', 'size_sqft', 'bedrooms', 'purchase_price', 'purchase_date', 'status']);

registerCrudRoutes('valuations', 'property_valuations', 'valuation_id',
  ['property_id', 'valuation_amount', 'valuation_date', 'valuation_method']);

registerCrudRoutes('investments', 'investments', 'investment_id',
  ['investor_id', 'property_id', 'amount_invested', 'ownership_percentage', 'investment_date']);

registerCrudRoutes('agents', 'agents', 'agent_id',
  ['name', 'email', 'phone', 'license_number', 'agency_name']);

registerCrudRoutes('transactions', 'transactions', 'transaction_id',
  ['property_id', 'agent_id', 'transaction_type', 'amount', 'transaction_date', 'buyer_name', 'seller_name']);

registerCrudRoutes('tenants', 'tenants', 'tenant_id',
  ['name', 'email', 'phone', 'national_id']);

registerCrudRoutes('leases', 'leases', 'lease_id',
  ['property_id', 'tenant_id', 'start_date', 'end_date', 'monthly_rent', 'security_deposit', 'status']);

registerCrudRoutes('rent-payments', 'rent_payments', 'payment_id',
  ['lease_id', 'amount_paid', 'due_date', 'paid_date', 'payment_status', 'payment_method']);

registerCrudRoutes('occupancy', 'occupancy_records', 'occupancy_id',
  ['property_id', 'unit_number', 'status', 'start_date', 'end_date']);

registerCrudRoutes('maintenance', 'maintenance_requests', 'request_id',
  ['property_id', 'tenant_id', 'issue_description', 'request_date', 'resolved_date', 'cost', 'status']);

registerCrudRoutes('expenses', 'expenses', 'expense_id',
  ['property_id', 'expense_category', 'amount', 'expense_date', 'description']);

registerCrudRoutes('mortgages', 'mortgages', 'mortgage_id',
  ['property_id', 'lender_name', 'principal_amount', 'interest_rate', 'term_years', 'start_date']);

registerCrudRoutes('mortgage-payments', 'mortgage_payments', 'mortgage_payment_id',
  ['mortgage_id', 'amount_paid', 'due_date', 'paid_date', 'remaining_balance']);

registerCrudRoutes('insurance', 'insurance_policies', 'policy_id',
  ['property_id', 'provider_name', 'policy_number', 'coverage_amount', 'premium_amount', 'start_date', 'end_date']);

registerCrudRoutes('managers', 'property_managers', 'manager_id',
  ['property_id', 'name', 'email', 'phone', 'management_fee_percentage']);

// ============================================================
// ANALYTICS ENDPOINTS (for the dashboard)
// These stay explicit since each one has its own custom logic
// ============================================================

// Rental yield % per property = (active leases' annual rent / latest valuation) * 100
app.get('/analytics/rental-yield', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.property_id, p.address, p.city,
        COALESCE(SUM(l.monthly_rent) FILTER (WHERE l.status = 'active'), 0) * 12 AS annual_rent,
        v.valuation_amount AS latest_valuation,
        ROUND(
          (COALESCE(SUM(l.monthly_rent) FILTER (WHERE l.status = 'active'), 0) * 12
          / NULLIF(v.valuation_amount, 0)) * 100, 2
        ) AS rental_yield_percent
      FROM properties p
      LEFT JOIN leases l ON l.property_id = p.property_id
      LEFT JOIN LATERAL (
        SELECT valuation_amount FROM property_valuations pv
        WHERE pv.property_id = p.property_id
        ORDER BY valuation_date DESC LIMIT 1
      ) v ON true
      GROUP BY p.property_id, p.address, p.city, v.valuation_amount
      ORDER BY p.property_id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Occupancy: latest status per property + overall occupied percentage
app.get('/analytics/occupancy-rate', async (req, res) => {
  try {
    const perProperty = await pool.query(`
      SELECT DISTINCT ON (property_id) property_id, unit_number, status, start_date, end_date
      FROM occupancy_records
      ORDER BY property_id, start_date DESC
    `);
    const summary = await pool.query(`
      SELECT status, COUNT(*) AS count
      FROM (
        SELECT DISTINCT ON (property_id) property_id, status
        FROM occupancy_records
        ORDER BY property_id, start_date DESC
      ) latest
      GROUP BY status
    `);
    res.json({ per_property: perProperty.rows, summary: summary.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ROI per investment = (current stake value - amount invested) / amount invested * 100
app.get('/analytics/roi', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.investment_id, i.investor_id, inv.name AS investor_name, i.property_id, p.address,
        i.amount_invested, i.ownership_percentage,
        v.valuation_amount AS current_valuation,
        ROUND((v.valuation_amount * i.ownership_percentage / 100), 2) AS current_stake_value,
        ROUND(
          ((v.valuation_amount * i.ownership_percentage / 100 - i.amount_invested)
          / NULLIF(i.amount_invested, 0)) * 100, 2
        ) AS roi_percent
      FROM investments i
      JOIN investors inv ON inv.investor_id = i.investor_id
      JOIN properties p ON p.property_id = i.property_id
      LEFT JOIN LATERAL (
        SELECT valuation_amount FROM property_valuations pv
        WHERE pv.property_id = i.property_id
        ORDER BY valuation_date DESC LIMIT 1
      ) v ON true
      ORDER BY i.investment_id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Expense breakdown by category (optionally filter by ?property_id=X)
app.get('/analytics/expense-breakdown', async (req, res) => {
  try {
    const { property_id } = req.query;
    let result;
    if (property_id) {
      result = await pool.query(
        `SELECT expense_category, SUM(amount) AS total_amount, COUNT(*) AS count
         FROM expenses WHERE property_id = $1
         GROUP BY expense_category ORDER BY total_amount DESC`,
        [property_id]
      );
    } else {
      result = await pool.query(
        `SELECT expense_category, SUM(amount) AS total_amount, COUNT(*) AS count
         FROM expenses GROUP BY expense_category ORDER BY total_amount DESC`
      );
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Portfolio value growth: full valuation history (frontend can chart per property or aggregate)
app.get('/analytics/portfolio-value', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pv.property_id, p.address, pv.valuation_amount, pv.valuation_date
      FROM property_valuations pv
      JOIN properties p ON p.property_id = pv.property_id
      ORDER BY pv.property_id, pv.valuation_date
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rent collection trends: on-time vs late vs missed (optionally filter by ?property_id=X)
app.get('/analytics/rent-collection', async (req, res) => {
  try {
    const { property_id } = req.query;
    let query = `
      SELECT rp.payment_status, COUNT(*) AS count
      FROM rent_payments rp
      JOIN leases l ON l.lease_id = rp.lease_id
    `;
    const params = [];
    if (property_id) {
      query += ' WHERE l.property_id = $1';
      params.push(property_id);
    }
    query += ' GROUP BY rp.payment_status';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Monthly rent collected total (for the area chart on the dashboard)
app.get('/analytics/monthly-rent-collection', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT TO_CHAR(due_date, 'YYYY-MM') AS month, SUM(amount_paid) AS total_collected
      FROM rent_payments
      GROUP BY month
      ORDER BY month
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SERVER IS RUNNING ON PORT ${PORT}`);
});

module.exports = app; // needed so Vercel can run this as a serverless function (harmless if not used)g