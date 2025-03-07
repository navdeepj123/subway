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
app.use('/public', express.static('public'));

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Route to render home page
app.get('/', function (req, res) {
    res.render('home');
});

// Route to render contact us page
app.get('/contactUs', function (req, res) {
    res.render('contactUs', { title: 'Contact Us' });
});

// Route to render Menu page
app.get('/Menu', function (req, res) {
    res.render('Menu', { title: 'Menu' });
});

// Route to render privacy policy page
app.get('/privacyPolicy', function (req, res) {
    res.render('privacyPolicy', { title: 'Privacy Policy' });
});

// Route to render learn more page
app.get('/learnmore', function (req, res) {
    res.render('learnmore', { title: 'LearnMore' });
});

// Route to render login page
app.get('/login', function (req, res) {
    res.render('login', { errorMessage: null, csrfToken: 'your_csrf_token' });
});

// Route to authenticate user login
app.post('/auth', function (req, res) {
    let name = req.body.username;
    let password = req.body.password;
    if (!name || !password) {
        return res.render('login', { errorMessage: 'Please enter both Username and Password!', csrfToken: 'your_csrf_token' });
    }

    conn.query('SELECT * FROM users WHERE name = ? AND password=?', [name, password],
        function (error, results) {
            if (error) {
                console.error('Database error:', error);
                return res.render('login', { errorMessage: 'Internal Server Error. Try again later.', csrfToken: 'your_csrf_token' });
            }

            if (results.length > 0) {
                req.session.loggedin = true;
                req.session.username = name;
                return res.redirect('/membersOnly');
            } else {
                return res.render('login', { errorMessage: 'Incorrect Username or Password!', csrfToken: 'your_csrf_token' });
            }
        });
});

// Route to render registration page
app.get('/register', function (req, res) {
    res.render("register", { title: 'Register' });
});

// Route to render subs page
app.get('/Subs', function (req, res) {
    res.render("Subs", { title: 'subs' });
});

// Route to render wraps page
app.get('/wraps', function (req, res) {
    res.render("wraps", { title: 'wraps' });
});

// Route to render drinks page
app.get('/drinks', function (req, res) {
    res.render("drinks", { title: 'drinks' });
});

// Route to render dessert page
app.get('/Dessert', function (req, res) {
    res.render("Dessert", { title: 'Dessert' });
});

// Route to handle user registration
app.post('/register', function (req, res) {
    let name = req.body.username;
    let password = req.body.password;
    if (name && password) {
        var sql = `INSERT INTO users(name,password) VALUES (?, ?)`;
        conn.query(sql, [name, password], function (error, results) {
            if (error) {
                console.error('Error inserting record:', error);
                return res.render('register', { title: 'Register', errorMessage: 'Error registering user. Try again later.' });
            }
            console.log('Record inserted');
            res.render('login', { errorMessage: 'Registration successful. Please log in.', csrfToken: 'your_csrf_token' });
        });
    } else {
        res.render('register', { title: 'Register', errorMessage: 'Please fill in all fields.' });
    }
});

// Route to render members-only page (accessible only if logged in)
app.get('/membersOnly', function (req, res, next) {
    if (req.session.loggedin) {
        res.render('membersOnly.ejs');
    }
    else {
        res.send('Please login to view this page!');
    }
});

// Route to handle user logout
app.get('/logout', (req, res) => {
    req.session.destroy(); // Destroy session to logout user
    res.redirect('/');
});

// Route to handle GET requests to the reviews page
app.get('/reviews', (req, res) => {
    // Fetch existing reviews from the database
    conn.query('SELECT * FROM `submit-review`', (error, results) => {
        if (error) {
            console.error('Error executing database query:', error);
            res.status(500).send('Internal Server Error');
            return;
        }

        // Render the 'reviews.ejs' template with the retrieved reviews
        res.render('reviews', { reviews: results });
    });
});

// Route to handle POST requests to submit reviews
app.post('/submit-review', (req, res) => {
    const { name, rating, comment } = req.body;

    // Insert the submitted review into the database
    conn.query('INSERT INTO `submit-review` (`Name`, `Rating`, `Comment`) VALUES (?, ?, ?)',
        [name, rating, comment],
        (error, results) => {
            if (error) {
                console.error('Error executing database query:', error);
                res.status(500).send('Internal Server Error');
                return;
            }

            // Redirect back to the reviews page after submission
            res.redirect('/reviews');
        });
});

// Start the server and listen on port 3000
app.listen(3000);
console.log('Node app is running on port 3000');