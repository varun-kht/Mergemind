// ============================================================================
// demo_bad_code.js — A deliberately terrible file for the MergeMind live demo.
//
// Contains: Exposed AWS keys, SQL injection, N+1 query, MD5 password hashing.
// Push this file in a PR and watch MergeMind tear it apart in real-time.
// ============================================================================

const crypto = require("crypto");
const mysql = require("mysql2/promise");

// 🔴 EXPOSED AWS CREDENTIALS — hardcoded in source
const AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE";
const AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
const JWT_SECRET = "super-secret-jwt-key-12345";

// Database connection
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root123",        // 🔴 Hardcoded DB credentials
  database: "production_db",
});

// 🔴 MD5 PASSWORD HASHING — cryptographically broken
function hashPassword(password) {
  return crypto.createHash("md5").update(password).digest("hex");
}

// 🔴 SQL INJECTION — user input directly concatenated into query
async function getUserByEmail(email) {
  const query = `SELECT * FROM users WHERE email = '${email}'`;
  const [rows] = await db.execute(query);
  return rows[0];
}

// 🔴 N+1 QUERY — fetching orders inside a loop
async function getAllUsersWithOrders() {
  const [users] = await db.execute("SELECT * FROM users");

  for (const user of users) {
    const [orders] = await db.execute(
      `SELECT * FROM orders WHERE user_id = '${user.id}'`  // Also SQL injection!
    );
    user.orders = orders;
  }

  return users;
}

// 🔴 INSECURE SESSION COOKIE — missing HttpOnly and Secure flags
function setSessionCookie(res, token) {
  res.cookie("session", token, {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    // Missing: httpOnly: true
    // Missing: secure: true
    // Missing: sameSite: "strict"
  });
}

// Register user endpoint
async function registerUser(req, res) {
  const { email, password, name } = req.body;

  // No input validation at all
  const hashedPassword = hashPassword(password);

  const query = `INSERT INTO users (email, password, name) VALUES ('${email}', '${hashedPassword}', '${name}')`;
  await db.execute(query);  // SQL injection again

  const token = JWT_SECRET + email;  // 🔴 "JWT" is just concatenation
  setSessionCookie(res, token);

  res.json({ success: true, message: "User created" });
}

module.exports = {
  hashPassword,
  getUserByEmail,
  getAllUsersWithOrders,
  registerUser,
};
