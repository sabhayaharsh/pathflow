const mysql = require('mysql');
const dotenv = require("dotenv")
dotenv.config();

// const db = mysql.createConnection({
//     host: process.env.DBHOST,
//     user: process.env.DBUSER,
//     password: process.env.DBPASSWORD,
//     port: process.env.DBPORT,
//     database: process.env.DBNAME,
// });

// db.connect(err => {
//     if (err) throw err;
//     console.log('Connected to MySQL database');
// });


const pool = mysql.createPool({
    connectionLimit: 5,
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASSWORD,
    port: process.env.DBPORT,
    database: process.env.DBNAME,
    charset: 'utf8mb4'
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to MySQL database:', err);
        return;
    }
    console.log('Connected to MySQL database');
    connection.release();
});

module.exports = pool;
