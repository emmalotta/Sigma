require("dotenv").config();
require("dotenv-safe").config({
    allowEmptyValues: true
});


const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");


const app = express();
const SECRET_KEY = process.env.SECRET_KEY;

app.use(cors());
app.use(bodyParser.json());


const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});



db.connect((err) => {
    if (err) throw err;
    console.log("Connected to MySQL database!");
});


const verifyToken = (req, res, next) => {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (process.env.NODE_ENV === "development") {
        console.log("Received Token:", token);
    }


    if (!token) {
        return res.status(401).json({ success: false, message: "No token provided." });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        console.log("Decoded Token:", decoded);
        req.user = decoded;
        next();
    } catch (err) {
        console.error("Token Verification Failed:", err.message);
        res.status(401).json({ success: false, message: "Invalid token." });
    }
};


// LOGIN
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    db.query("SELECT * FROM users WHERE username = ?", [username], async (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid username or password." });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid username or password." });
        }

        const token = jwt.sign({ username: user.username, role: user.role }, SECRET_KEY, { expiresIn: "1h" });
        res.json({ success: true, message: "Login successful!", token, role: user.role });
    });
});



// ADD USER
app.post("/api/create-employee", verifyToken, async (req, res) => {
    console.log("🔹 Received Request:", req.body);

    if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Unauthorized. Admins only." });
    }

    const { newUsername, newPassword, role } = req.body;

    const employeeRole = role || "machine_operator";

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        db.query(
            "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
            [newUsername, hashedPassword, employeeRole],
            (err, result) => {
                if (err) {
                    console.error("Database Error:", err);
                    return res.status(500).json({ success: false, message: "Database error" });
                }
                res.json({ success: true, message: "Employee account created successfully!" });
            }
        );
    } catch (error) {
        console.error("Hashing Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});



// ORDERS
app.post("/api/orders", verifyToken, (req, res) => {
    if (req.user.role !== "machine_operator") {
        return res.status(403).json({ success: false, message: "Unauthorized. Only machine operators can create orders." });
    }

    const { order_type, replacement_crate, additional_notes } = req.body;
    const machineOperator = req.user.username;

    if (!order_type || !['crate_removal', 'rubber', 'packaging', 'component'].includes(order_type)) {
        return res.status(400).json({ success: false, message: "Invalid order type." });
    }

    let replacementValue = null;

    // REMOVAL
    if (order_type === 'crate_removal') {
        if (replacement_crate !== 'yes' && replacement_crate !== 'no') {
            return res.status(400).json({ success: false, message: "replacement_crate must be 'yes' or 'no' for crate_removal." });
        }
        replacementValue = replacement_crate;
    }

    const query = order_type === 'crate_removal'
        ? "INSERT INTO orders (machine_operator, order_type, replacement_crate, additional_notes, status) VALUES (?, ?, ?, ?, 'pending')"
        : "INSERT INTO orders (machine_operator, order_type, additional_notes, status) VALUES (?, ?, ?, 'pending')";

    const values = order_type === 'crate_removal'
        ? [machineOperator, order_type, replacementValue, additional_notes || null]
        : [machineOperator, order_type, additional_notes || null];

    console.log("Final values:", values);

    db.query(query, values, (err, result) => {
        if (err) {
            console.error("SQL Error:", err.sqlMessage);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        res.json({ success: true, message: "Order created successfully!" });
    });
});



// Retrieve pending orders (Hall Workers)
app.get("/api/orders", verifyToken, (req, res) => {
    if (req.user.role !== "hall_worker") {
        return res.status(403).json({ success: false, message: "Unauthorized. Only hall workers can view orders." });
    }

    db.query("SELECT * FROM orders WHERE status = 'pending'", (err, results) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        res.json({ success: true, orders: results });
    });
});


// Mark order as received (Hall Workers)
app.put("/api/orders/:id", verifyToken, (req, res) => {
    if (req.user.role !== "hall_worker") {
        return res.status(403).json({ success: false, message: "Unauthorized. Only hall workers can receive orders." });
    }

    const orderId = req.params.id;

    db.query(
        "UPDATE orders SET status = 'received' WHERE id = ?",
        [orderId],
        (err, result) => {
            if (err) {
                console.error("Database Error:", err);
                return res.status(500).json({ success: false, message: "Database error" });
            }
            res.json({ success: true, message: "Order marked as received!" });
        }
    );
});



app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
