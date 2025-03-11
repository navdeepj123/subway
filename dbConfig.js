// Importing MySQL module
var mysql = require('mysql');

// Creating a connection pool to optimize database connections
var conn = mysql.createPool({
    connectionLimit: 10, // Allows multiple connections to prevent overload
    host: 'localhost', // MySQL server
    user: 'root', // MySQL username
    password: '', // MySQL password (keep empty if not set)
    database: 'subway', // Make sure this matches your actual database name
    multipleStatements: true // Allows executing multiple SQL statements at once
});

// Connecting to the MySQL database (Test Connection)
conn.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database Connection Failed:', err);
        return;
    }
    console.log('✅ Database is connected successfully!');
    connection.release(); // Release connection after testing
});

// Exporting the database connection pool for use in other files
module.exports = conn;
