// Fixing SyntaxError in server.js (line 36)

const express = require("express");
const sql = require("mssql");
const { Connector } = require("@google-cloud/cloud-sql-connector");
const cors = require("cors");
require("dotenv").config();
const { Storage } = require('@google-cloud/storage');

const app = express();
const port = process.env.PORT || 8080; // Cloud Run will provide this port

app.use(cors());

let pool;

async function initializeDbPool() {
  const connector = new Connector();
  const tediousOptions = await connector.getTediousOptions({
    instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME,
  });

  const mssqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: 'REQUIRED-BUT-UNUSED', // Dummy value required by tedious driver
    database: process.env.DB_NAME,
    options: {
      ...tediousOptions,
      encrypt: false,
      trustServerCertificate: false
    }
  };
  pool = new sql.ConnectionPool(mssqlConfig);
  await pool.connect();
  console.log('Connected to SQL Server via Cloud SQL Connector');
}

initializeDbPool().catch(err => {
  console.error('Failed to connect to DB:', err);
  process.exit(1);
});

// Initialize Google Cloud Storage client
const storage = new Storage({
  // Use default service account credentials
  projectId: 'plus-percent',
});

// Endpoint to list files in your bucket
app.get('/gcs-files', async (req, res) => {
  try {
    const [files] = await storage.bucket('20pluspercentpricedata').getFiles();
    res.json(files.map(file => file.name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to download a file from your bucket
app.get('/gcs-file', async (req, res) => {
  const { filename } = req.query;
  if (!filename) return res.status(400).json({ error: 'Filename required' });

  const bucket = storage.bucket('20pluspercentpricedata');
  const file = bucket.file(filename);

  file.createReadStream()
    .on('error', err => res.status(500).json({ error: err.message }))
    .pipe(res);
});

function isSafeTableName(name) {
  return /^[a-zA-Z0-9_]+$/.test(name);
}

app.get("/stocks", async (req, res) => {
  console.log("Received query parameters:", req.query);
  const { symbol, from, to, columns } = req.query;
  const table = `${symbol}`;

  if (!isSafeTableName(table)) {
    return res.status(400).json({ error: "Invalid symbol format." });
  }

  let selectColumns = "*";
  if (columns) {
    const columnList = columns.split(',').map(col => col.trim()).filter(col => col.length > 0);
    if (columnList.length > 0) {
      // Basic sanitization for column names (ensure they are alphanumeric and underscores)
      const safeColumnList = columnList.filter(col => /^[a-zA-Z0-9_%]+$/.test(col));
      if (safeColumnList.length !== columnList.length) {
        return res.status(400).json({ error: "Invalid column name format." });
      }
      selectColumns = safeColumnList.map(col => `[${col}]`).join(', ');
    }
  }

  try {
    const request = pool.request();
    console.log("Setting 'from' parameter to:", from);
    request.input('from', sql.Date, new Date(from));
    console.log("Setting 'to' parameter to:", to);
    request.input('to', sql.Date, new Date(to));
    const query = `SELECT ${selectColumns} FROM ${table} WHERE Date BETWEEN @from AND @to ORDER BY Date ASC`;
    console.log("Executing query:", query);
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Query failed for table:", table);
    console.error("Error message:", err.message);
    console.error("Full error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

const https = require('https');
const fs = require('fs');
const devCerts = require('office-addin-dev-certs');

initializeDbPool().then(async () => {
  const httpsOptions = await devCerts.getHttpsServerOptions();
  const server = https.createServer(httpsOptions, app);

  server.listen(port, () => console.log(`Server running on https://localhost:${port}`));
}).catch(err => console.error('Failed to start server due to DB connection error:', err));
