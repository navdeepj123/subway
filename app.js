const express = require('express');
const app = express();
const session = require('express-session');
const mysql = require('mysql');
const conn = require('./dbConfig'); // Database configuration file

// Setup view engine as EJS
app.set('view engine', 'ejs');

// Middleware configuration
app.use('/public', express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session management middleware
app.use(session({
    secret: 'yoursecret',
    resave: true,
    saveUninitialized: true
}));

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

    conn.query('SELECT * FROM users WHERE name = ? AND password = ?', [name, password], (error, results) => {
        if (error) return res.status(500).send('Internal Server Error');
        if (results.length > 0) {
            req.session.loggedin = true;
            req.session.username = name;
            res.redirect('/menu');
        } else {
            res.render('login', { errorMessage: 'Incorrect Username and/or Password!', csrfToken: 'your_csrf_token' });
        }
    });
});

// Initialize cart in session if not exists
app.use((req, res, next) => {
    if (!req.session.cart) {
        req.session.cart = [];
    }
    next();
});

// Middleware to restrict access to certain pages before login
app.use(['/logout', '/reviews'], (req, res, next) => {
    if (!req.session.loggedin) {
        return res.redirect('/login');
    }
    next();
});

// Routes
app.get('/', (req, res) => res.render('home', { title: 'Home', session: req.session }));
app.get('/contactUs', (req, res) => res.render('contactUs', { title: 'Contact Us', session: req.session }));
app.get('/privacyPolicy', (req, res) => res.render('privacyPolicy', { title: 'Privacy Policy', session: req.session }));
app.get('/learnmore', (req, res) => res.render('learnmore', { title: 'Learn More', session: req.session }));
app.get('/openingHours', (req, res) => res.render('openingHours', { title: 'Opening Hours', session: req.session }));
app.get('/login', (req, res) => res.render('login', { title: 'Login' }));
app.get('/register', (req, res) => res.render('register', { title: 'Register' }));

// User Authentication
app.post('/auth', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.send('Please enter Username and Password!');

    conn.query('SELECT * FROM users WHERE name = ? AND password = ?', [username, password], (error, results) => {
        if (error) return res.status(500).send('Internal Server Error');
        if (results.length > 0) {
            req.session.loggedin = true;
            req.session.username = username;
            res.redirect('/menu');
        } else {
            res.send('Incorrect Username and/or Password!');
        }
    });
});

// User Registration
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (username && password) {
        conn.query('INSERT INTO users (name, password) VALUES (?, ?)', [username, password], (error) => {
            if (error) return res.status(500).send('Internal Server Error');
            res.redirect('/login');
        });
    } else {
        res.send('Please enter a Username and Password.');
    }
});

// Menu & Cart
app.get('/menu', (req, res) => {
    if (!req.session.loggedin) return res.redirect('/login');
    req.session.accessMenu = true; // Allow access to related pages after menu login
    res.render('menu', { title: 'Menu', session: req.session });
});

// Route to render subs page
app.get('/Subs', function (req, res) {
    res.render("Subs", { session: req.session });
});

// Route to render wraps page
app.get('/wraps', function (req, res) {
    res.render("wraps", {  session: req.session});
});

// Route to render drinks page
app.get('/drinks', function(req, res) {
    res.render("drinks", { session: req.session });
});


// Route to render dessert page
app.get('/Dessert', function (req, res) {
    res.render("Dessert", {  session: req.session});
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

app.get('/subs', (req, res) => res.render('subs', { title: 'Subs', session: req.session }));
app.get('/wraps', (req, res) => res.render('wraps', { title: 'Wraps', session: req.session }));
app.get('/drinks', (req, res) => res.render('drinks', { title: 'Drinks', session: req.session }));
app.get('/dessert', (req, res) => res.render('dessert', { title: 'Dessert', session: req.session }));

// Add item to cart
app.post('/add-to-cart', (req, res) => {
    const { name, price, quantity } = req.body;

    if (!name || !price || !quantity) {
        return res.send('Invalid item details');
    }

    const cartItem = { name, price: parseFloat(price), quantity: parseInt(quantity) };

    // Check if item already exists in cart
    const itemIndex = req.session.cart.findIndex(item => item.name === name);

    if (itemIndex > -1) {
        req.session.cart[itemIndex].quantity += cartItem.quantity; // Increase quantity if item exists
    } else {
        req.session.cart.push(cartItem); // Add item if it does not exist
    }

    res.redirect('/cart');
});

// View Cart
app.get('/cart', (req, res) => {
    const cart = req.session.cart || [];
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    res.render('cart', { cart, total });
});

// Remove item from cart
app.post('/remove-from-cart', (req, res) => {
    const { itemName } = req.body;  // Use item name for identification
    if (req.session.cart) {
        req.session.cart = req.session.cart.filter(item => item.name !== itemName); // Remove the item by name
    }
    res.redirect('/cart');  // Redirect to the cart page after the update
});

// Clear Cart
app.post('/clear-cart', (req, res) => {
    req.session.cart = [];
    res.redirect('/cart');
});

// Reviews

app.get('/reviews', (req, res) => {
    conn.query('SELECT * FROM submit_review ORDER BY CreatedAt DESC', (error, reviews) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).send('Internal Server Error');
        }

        conn.query('SELECT Rating, COUNT(*) as count FROM submit_review GROUP BY Rating', (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send('Internal Server Error');
            }

            let ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
            results.forEach(row => {
                let starCount = parseInt(row.Rating, 10);
                if (starCount >= 1 && starCount <= 5) {
                    ratingCounts[starCount] = row.count;
                }
            });

            res.render('reviews', {
                reviews,
                session: req.session,
                ratingCounts,
                totalReviews: reviews.length
            });
        });
    });
});

app.post('/submit-review', (req, res) => {
    if (!req.session.loggedin) return res.redirect('/login');
    const { name, rating, comment } = req.body;
    conn.query('INSERT INTO submit_review (Name, Rating, Comment) VALUES (?, ?, ?)', [name, rating, comment], (error) => {
        if (error) return res.status(500).send('Internal Server Error');
        res.redirect('/reviews');
    });
});

// Start the server and listen on port 3000
app.listen(3000);
console.log('Node app is running on port 3000');
