const express = require('express');
const app = express();
const session = require('express-session');
const mysql = require('mysql');
const db = require('./dbConfig'); // ✅ Use correct DB connection

// Setup view engine
app.set('view engine', 'ejs');

// Middleware
app.use('/public', express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'yoursecret',
    resave: true,
    saveUninitialized: true
}));

// Init cart session
app.use((req, res, next) => {
    if (!req.session.cart) req.session.cart = [];
    next();
});

// Restrict access
app.use(['/logout', '/reviews'], (req, res, next) => {
    if (!req.session.loggedin) return res.redirect('/login');
    next();
});

// Pages
app.get('/', (req, res) => res.render('home', { title: 'Home', session: req.session }));
app.get('/contactUs', (req, res) => res.render('contactUs', { title: 'Contact Us', session: req.session }));
app.get('/privacyPolicy', (req, res) => res.render('privacyPolicy', { title: 'Privacy Policy', session: req.session }));
app.get('/learnmore', (req, res) => res.render('learnmore', { title: 'Learn More', session: req.session }));
app.get('/openingHours', (req, res) => res.render('openingHours', { title: 'Opening Hours', session: req.session }));
app.get('/login', (req, res) => res.render('login', { title: 'Login', session: req.session, errorMessage: null, csrfToken: 'your_csrf_token' }));
app.get('/register', (req, res) => res.render('register', { title: 'Register', session: req.session }));

// Auth
app.post('/auth', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.render('login', { errorMessage: 'Please enter both Username and Password!', csrfToken: 'your_csrf_token' });
    }
    db.query('SELECT * FROM users WHERE name = ? AND password = ?', [username, password], (err, results) => {
        if (err) return res.status(500).send('Internal Server Error');
        if (results.length > 0) {
            req.session.loggedin = true;
            req.session.username = username;
            res.redirect('/menu'); // ✅ Redirect to menu after login
        } else {
            res.render('login', { errorMessage: 'Incorrect Username and/or Password!', csrfToken: 'your_csrf_token' });
        }
    });
});

// User Registration
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (username && password) {
        db.query('INSERT INTO users(name, password) VALUES (?, ?)', [username, password], (err) => {
            if (err) {
                console.error('Error inserting record:', err);
                return res.render('register', { title: 'Register', errorMessage: 'Error registering user. Try again later.' });
            }
            res.render('login', { errorMessage: 'Registration successful. Please log in.', csrfToken: 'your_csrf_token' });
        });
    } else {
        res.render('register', { title: 'Register', errorMessage: 'Please fill in all fields.' });
    }
});

// Payment
app.get('/payment', (req, res) => res.render('payment'));
app.post('/process-payment', (req, res) => {
    const { name, card_number, expiry, cvv, amount } = req.body;
    db.query('INSERT INTO payments (name, card_number, expiry, cvv, amount) VALUES (?, ?, ?, ?, ?)', [name, card_number, expiry, cvv, amount], (err) => {
        if (err) return res.send('Payment failed. Please try again.');
        res.send('<h2>Payment Successful!</h2><a href="/payment">Make another payment</a>');
    });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Menu Pages
app.get('/menu', (req, res) => {
    if (!req.session.loggedin) return res.redirect('/login');
    res.render('menu', { title: 'Menu', session: req.session });
});
app.get('/subs', (req, res) => res.render('subs', { title: 'Subs', session: req.session }));
app.get('/wraps', (req, res) => res.render('wraps', { title: 'Wraps', session: req.session }));
app.get('/drinks', (req, res) => res.render('drinks', { title: 'Drinks', session: req.session }));
app.get('/dessert', (req, res) => res.render('dessert', { title: 'Dessert', session: req.session }));

// Cart
app.get('/cart', (req, res) => {
    if (!req.session.loggedin) return res.redirect('/login');
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

// Checkout
app.get('/checkout', (req, res) => res.render('checkout', { cart: req.session.cart || [], total: req.session.total || 0 }));

// Order Confirmation
app.get('/order-confirmation', (req, res) => {
    res.render('orderConfirmation', {
        title: 'Order Confirmation',
        message: 'Your order has been placed successfully!',
        username: req.session.username || 'Guest'
    });
});

// Start Server
app.listen(3000, () => console.log('Node app is running on port 3000'));
