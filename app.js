// Required modules
var express = require('express');
var app = express();
var session = require('express-session');
var mysql = require('mysql');
var conn = require('./dbConfig'); // Custom database configuration file

// Set view engine to EJS
app.set('view engine', 'ejs');

// Middleware for session management
app.use(session({
    secret: 'yoursecret', // Secret key for session encryption
    resave: true,
    saveUninitialized: true
}));

// Middleware to serve static files
app.use(express.static("public"));
app.use('/public', express.static(__dirname + '/public'));



// Middleware to parse JSON bodies and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to make user data available in all views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null; // Stores user session data in res.locals for easy access in EJS
    next();
});

// Home Page Route
app.get('/', function (req, res) {
    res.render('home', { user: req.session.user, page: 'home' });
});

// Contact Us Page
app.get('/contactUs', function (req, res) {
    res.render('contactUs', { title: 'Contact Us', user: req.session.user, page: 'contactUs' });
});

// Handle Contact Form Submission
app.post("/send-message", (req, res) => {
    const { name, email, message } = req.body;
    console.log(`New message from ${name} (${email}): ${message}`);
    res.send("Message received! We will get back to you soon.");
});

// Login Page
app.get('/login', function (req, res) {
    res.render('login', { user: req.session.user, page: 'login' });
});

// Register Page
app.get('/register', function (req, res) {
    res.render('register', { user: req.session.user, page: 'register' });
});

// Authenticate Login
app.post('/auth', function (req, res) {
    let name = req.body.username;
    let password = req.body.password;

    if (name && password) {
        conn.query('SELECT * FROM users WHERE name = ? AND password=?', [name, password], function (error, results) {
            if (error) throw error;

            if (results.length > 0) {
                req.session.user = { username: name };
                res.redirect('/Menu'); // Redirect to Menu after login
            } else {
                res.send('Incorrect Username and/or Password!');
            }
        });
    } else {
        res.send('Please enter Username and Password!');
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Restricted Pages: Only logged-in users can access these
const ensureAuthenticated = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};

// Menu Page (restricted)
app.get('/Menu', ensureAuthenticated, function (req, res) {
    res.render('Menu', { title: 'Menu', user: req.session.user, page: 'menu' });
});

// Food Category Pages (restricted)
app.get('/Subs', ensureAuthenticated, function (req, res) {
    res.render("Subs", { title: 'Subs', user: req.session.user, page: 'subs' });
});

app.get('/Wraps', ensureAuthenticated, function (req, res) {
    res.render("Wraps", { title: 'Wraps', user: req.session.user, page: 'wraps' });
});

app.get('/Drinks', ensureAuthenticated, function (req, res) {
    res.render("Drinks", { title: 'Drinks', user: req.session.user, page: 'drinks' });
});

app.get('/Dessert', ensureAuthenticated, function (req, res) {
    res.render("Dessert", { title: 'Dessert', user: req.session.user, page: 'dessert' });
});

// User Registration
app.post('/register', function (req, res) {
    let name = req.body.username;
    let password = req.body.password;

    if (name && password) {
        var sql = `INSERT INTO users(name,password) VALUES (?,?)`;
        conn.query(sql, [name, password], function (error) {
            if (error) throw error;
            console.log('Record inserted');
            res.redirect('/login');
        });
    } else {
        console.log("Error");
    }
});

// Members Only Page (restricted)
app.get('/membersOnly', ensureAuthenticated, function (req, res) {
    res.render('membersOnly.ejs', { user: req.session.user, page: 'membersOnly' });
});

// Reviews Page
app.get('/reviews', (req, res) => {
    conn.query('SELECT * FROM `submit-review`', (error, results) => {
        if (error) {
            console.error('Error executing database query:', error);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.render('reviews', { reviews: results, user: req.session.user, page: 'reviews' });
    });
});

// Submit Reviews
app.post('/submit-review', (req, res) => {
    const { name, rating, comment } = req.body;

    conn.query('INSERT INTO `submit-review` (`Name`, `Rating`, `Comment`) VALUES (?, ?, ?)', [name, rating, comment], (error) => {
        if (error) {
            console.error('Error executing database query:', error);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.redirect('/reviews');
    });
});

// Opening Hours Page
app.get('/openingHours', function (req, res) {
    res.render('openingHours', { title: 'Opening Hours', user: req.session.user, page: 'openingHours' });
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Node app is running on port ${port}`);
});
