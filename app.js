const express = require('express');
const session = require('express-session');
const db = require('./dbConfig');
const app = express();

// Setup view engine
app.set('view engine', 'ejs');

// Middleware
app.use('/public', express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (only declare it once)
app.use(session({ secret: 'yoursecret', resave: true, saveUninitialized: true }));

// Initialize cart in session if not exists
app.use((req, res, next) => {
    if (!req.session.cart) req.session.cart = [];
    next();
});

// Restrict access middleware
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

// Authentication
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
            res.redirect('/subs');
        } else {
            res.render('login', { errorMessage: 'Incorrect Username and/or Password!' });
        }
    });
});

// User Registration
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (username && password) {
        db.query('INSERT INTO users(name, password) VALUES (?, ?)', [username, password], (err) => {
            if (err) return res.render('register', { title: 'Register', errorMessage: 'Error registering user. Try again later.' });
            res.render('login', { errorMessage: 'Registration successful. Please log in.' });
        });
    } else {
        res.render('register', { title: 'Register', errorMessage: 'Please fill in all fields.' });
    }
});

// Food Pages
app.get('/menu', (req, res) => res.render('menu', { title: 'Menu', session: req.session }));
app.get('/subs', (req, res) => res.render('subs', { title: 'Subs', session: req.session }));
app.get('/wraps', (req, res) => res.render('wraps', { title: 'Wraps', session: req.session }));
app.get('/drinks', (req, res) => res.render('drinks', { title: 'Drinks', session: req.session }));
app.get('/dessert', (req, res) => res.render('dessert', { title: 'Dessert', session: req.session }));

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
    req.session.destroy(() => res.redirect('/'));
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

// Add to cart route
app.post("/add-to-cart", (req, res) => {
    const { name, basePrice, totalPrice, quantity, selectedToppings } = req.body;

    // Convert numeric values
    const basePriceNum = parseFloat(basePrice) || 0;
    const totalPriceNum = parseFloat(totalPrice) || basePriceNum;  // Ensure total price isn't zero
    const quantityNum = parseInt(quantity) || 1;

    // Check if item already exists in cart
    const existingItem = req.session.cart.find(item => item.name === name && item.selectedToppings === selectedToppings);

    if (existingItem) {
        // If the item exists, update the quantity & recalculate total price
        existingItem.quantity += quantityNum;
        existingItem.totalPrice = (existingItem.basePrice + (existingItem.toppingsCost || 0)) * existingItem.quantity;
    } else {
        // Add new item to cart
        req.session.cart.push({
            name,
            basePrice: basePriceNum,
            totalPrice: totalPriceNum,
            quantity: quantityNum,
            selectedToppings: selectedToppings || "None"
        });
    }

    console.log("Updated Cart:", req.session.cart);
    res.redirect("/cart");  // Redirect user to the cart page
});

// View cart route
app.get("/cart", (req, res) => {
    res.render("cart", { cart: req.session.cart });
});

// Checkout
app.get('/checkout', (req, res) => res.render('checkout', { cart: req.session.cart || [], total: req.session.total || 0 }));
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

// Start Server
app.listen(4000, () => console.log('Node app is running on port 4000'));
