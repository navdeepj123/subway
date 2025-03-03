// Importing the 'mysql' module to interact with the MySQL database
var mysql = require('mysql');

// Creating a connection to the MySQL database
var conn = mysql.createConnection({
	host: 'localhost', // MySQL server host
	user: 'root', // MySQL username
	password: '', // MySQL password (empty in this case)
	database: 'Subway' // MySQL database name
});

// Connecting to the MySQL database
conn.connect(function(err) {
	if (err) throw err; // Handling connection errors, if any
	console.log('Database is connected successfully !'); // Logging successful connection message on the console
});

// Exporting the database connection object to make it available for use in other files
module.exports = conn;
