var express = require('express');
var app = express();
var session = require('express-session');
var mysql = require('mysql');
var conn = require('./dbConfig'); // Database configuration file

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

// Initialize cart in session if not exists
app.use((req, res, next) => {
    if (!req.session.cart) {
        req.session.cart = [];
    }
    next();
});

// Middleware to restrict access to menu pages before login
app.use(['/subs', '/wraps', '/drinks', '/dessert', '/logout', '/reviews'], (req, res, next) => {
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

app.get('/subs', (req, res) => res.render('subs', { title: 'Subs', session: req.session }));
app.get('/wraps', (req, res) => res.render('wraps', { title: 'Wraps', session: req.session }));
app.get('/drinks', (req, res) => res.render('drinks', { title: 'Drinks', session: req.session }));
app.get('/dessert', (req, res) => res.render('dessert', { title: 'Dessert', session: req.session }));

app.post('/add-to-cart', (req, res) => {
    req.session.cart.push({ name: req.body.name, price: parseFloat(req.body.price) });
    res.redirect('/cart');
});

app.get('/cart', (req, res) => {
    const cart = req.session.cart || [];
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    res.render('cart', { cart, total });
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

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Start the Server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
