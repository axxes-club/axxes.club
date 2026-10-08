require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const {consume,clientIp} = require('./security.cjs');

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: Register for beta
app.post('/api/register', async (req, res) => {
    try { await consume(pool, 'register:global', 120); await consume(pool, 'register:ip:'+clientIp(req.headers), 5); } catch(e) { return res.status(e.status||503).json({error:'Registration temporarily unavailable'}); }
    const { invite_code, name, email } = req.body || {};
    if (![invite_code,name,email].every(v=>typeof v==='string') || invite_code.length>100 || name.length>200 || email.length>254) return res.status(400).json({error:'Invalid registration'});

    // Validate required fields
    if (!invite_code || !name || !email) {
        return res.status(400).json({
            error: 'All fields are required'
        });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            error: 'Invalid email format'
        });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check if invite code exists and is valid
        const codeResult = await client.query(
            'SELECT * FROM invite_codes WHERE code = $1 AND is_active = true',
            [invite_code.toUpperCase()]
        );

        if (codeResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Invalid invite code. Please check your code and try again.'
            });
        }

        const inviteCodeData = codeResult.rows[0];

        // Check if code has reached max uses
        if (inviteCodeData.current_uses >= inviteCodeData.max_uses) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'This invite code has reached its maximum number of uses.'
            });
        }

        // Check if email is already registered
        const existingUser = await client.query(
            'SELECT * FROM beta_registrations WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'This email is already registered for beta access.'
            });
        }

        // Atomically consume capacity before granting the registration. The
        // predicate is rechecked after any concurrent row lock is released.
        const consumed = await client.query(
            'UPDATE invite_codes SET current_uses=current_uses+1 WHERE code=$1 AND is_active=true AND current_uses<max_uses RETURNING code',
            [invite_code.toUpperCase()]
        );
        if (consumed.rows.length !== 1) {
            await client.query('ROLLBACK');
            return res.status(400).json({error:'This invite code has reached its maximum number of uses.'});
        }
        await client.query(
            'INSERT INTO beta_registrations (email, name, invite_code) VALUES ($1, $2, $3)',
            [email.toLowerCase(), name, invite_code.toUpperCase()]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Successfully registered for beta access!'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'An error occurred during registration. Please try again.'
        });
    } finally {
        client.release();
    }
});

// API: Check invite code validity (optional - for real-time validation)
app.get('/api/check-code/:code', async (req, res) => {
    try { await consume(pool,'check:global',240); await consume(pool,'check:ip:'+clientIp(req.headers),20); } catch(e) { return res.status(e.status||503).json({error:'Code checks temporarily unavailable'}); }
    const { code } = req.params;

    try {
        const result = await pool.query(
            'SELECT code, max_uses, current_uses FROM invite_codes WHERE code = $1 AND is_active = true',
            [code.toUpperCase()]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ valid: false });
        }

        const codeData = result.rows[0];
        const valid = codeData.current_uses < codeData.max_uses;

        res.json({ valid });

    } catch (error) {
        console.error('Code check error:', error);
        res.status(500).json({ error: 'Error checking code' });
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Export for Vercel
module.exports = app;
