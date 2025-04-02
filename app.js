const express = require('express');
const app = express();
const session = require('express-session');
const db = require('./dbConfig');

// Setup view engine
app.set('view engine', 'ejs');

// Middleware
app.use('/public', express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'yoursecret', resave: true, saveUninitialized: true }));

// Initialize cart in session if not exists
app.use((req, res, next) => {
    if (!req.session.cart) req.session.cart = [];
    next();
});

// Restrict access
app.use(['/logout', '/reviews', '/cart', '/checkout', '/payment'], (req, res, next) => {
    if (!req.session.loggedin) return res.redirect('/login');
    next();
});

// Pages
app.get('/', (req, res) => res.render('home', { title: 'Home', session: req.session }));
app.get('/contactUs', (req, res) => res.render('contactUs', { title: 'Contact Us', session: req.session }));
app.get('/privacyPolicy', (req, res) => res.render('privacyPolicy', { title: 'Privacy Policy', session: req.session }));
app.get('/learnmore', (req, res) => res.render('learnmore', { title: 'Learn More', session: req.session }));
app.get('/openingHours', (req, res) => res.render('openingHours', { title: 'Opening Hours', session: req.session }));
app.get('/login', (req, res) => res.render('login', { title: 'Login', session: req.session, errorMessage: null }));
app.get('/register', (req, res) => res.render('register', { title: 'Register', session: req.session }));

// Auth
app.post('/auth', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.render('login', { errorMessage: 'Please enter both Username and Password!' });
    }
    db.query('SELECT * FROM users WHERE name = ? AND password = ?', [username, password], (err, results) => {
        if (err) return res.status(500).send('Internal Server Error');
        if (results.length > 0) {
            req.session.loggedin = true;
            req.session.username = username;
            res.redirect('/menu');
        } else {
            res.render('login', { errorMessage: 'Incorrect Username and/or Password!' });
        }
    });
});

// Registration
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (username && password) {
        db.query('INSERT INTO users(name, password) VALUES (?, ?)', [username, password], (err) => {
            if (err) {
                console.error('Error inserting record:', err);
                return res.render('register', { title: 'Register', errorMessage: 'Error registering user. Try again later.' });
            }
            res.render('login', { errorMessage: 'Registration successful. Please log in.' });
        });
    } else {
        res.render('register', { title: 'Register', errorMessage: 'Please fill in all fields.' });
    }
});

// Render food pages
app.get('/menu', (req, res) => res.render('menu', { title: 'Menu', session: req.session }));
app.get('/subs', (req, res) => res.render('subs', { title: 'Subs', session: req.session }));
app.get('/wraps', (req, res) => res.render('wraps', { title: 'Wraps', session: req.session }));
app.get('/drinks', (req, res) => res.render('drinks', { title: 'Drinks', session: req.session }));
app.get('/dessert', (req, res) => res.render('dessert', { title: 'Dessert', session: req.session }));

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Reviews
app.get('/reviews', (req, res) => {
    db.query('SELECT * FROM submit_review ORDER BY CreatedAt DESC', (error, reviews) => {
        if (error) return res.status(500).send('Internal Server Error');
        res.render('reviews', { reviews, session: req.session });
    });
});

app.post('/submit-review', (req, res) => {
    if (!req.session.loggedin) return res.redirect('/login');
    const { name, rating, comment } = req.body;
    db.query('INSERT INTO submit_review (Name, Rating, Comment) VALUES (?, ?, ?)', [name, rating, comment], err => {
        if (err) return res.status(500).send('Internal Server Error');
        res.redirect('/reviews');
    });
});

// Cart & Checkout
app.get('/cart', (req, res) => {
    const cart = req.session.cart || [];
    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    res.render('cart', { cart, total });
});

app.post('/add-to-cart', (req, res) => {
    const { name, price, quantity } = req.body;
    if (!req.session.cart) req.session.cart = [];
    const existingItem = req.session.cart.find(item => item.name === name);
    if (existingItem) {
        existingItem.quantity += parseInt(quantity);
    } else {
        req.session.cart.push({ name, price: parseFloat(price), quantity: parseInt(quantity) });
    }
    res.redirect(req.get('Referer') || '/');
});

app.post('/remove-from-cart', (req, res) => {
    req.session.cart.splice(req.body.index, 1);
    res.redirect('/cart');
});

app.post('/checkout', (req, res) => {
    const cart = req.session.cart || [];
    if (cart.length === 0) return res.redirect('/cart');
    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    db.query('INSERT INTO orders (username, items, total_price) VALUES (?, ?, ?)', [req.session.username, JSON.stringify(cart), total], (err) => {
        if (err) return res.status(500).send('Error processing order');
        req.session.cart = [];
        res.redirect('/order-confirmation');
    });
});

app.get('/order-confirmation', (req, res) => {
    res.render('orderConfirmation', { title: 'Order Confirmation', message: 'Your order has been placed successfully!', username: req.session.username || 'Guest' });
});

// Start Server
app.listen(3000, () => console.log('Node app is running on port 3000'));
