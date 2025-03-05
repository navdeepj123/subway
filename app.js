var express = require('express');
var app = express();
var session = require('express-session');
var mysql = require('mysql');
var conn = require('./dbConfig');

app.set('view engine', 'ejs');

app.use(session({
    secret: 'yoursecret',
    resave: true,
    saveUninitialized: true
}));

app.use('/public', express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Home Route
app.get('/', function (req, res) {
    res.render('home', { title: 'Home' });
});

// Login and Register Routes
app.get('/login', function (req, res) {
    res.render('login', { title: 'Login' });
});
app.get('/register', function (req, res) {
    res.render("register", { title: 'Register' });
});

// Route to authenticate user login
app.post('/auth', function (req, res) {
    let name = req.body.username;
    let password = req.body.password;
    
    if (!name || !password) {
        return res.send('Please enter Username and Password!');
    }

    conn.query('SELECT * FROM users WHERE name = ? AND password=?', [name, password], function (error, results) {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).send('Internal Server Error');
        }
        if (results.length > 0) {
            req.session.loggedin = true;
            req.session.username = name;
            res.redirect('/menu');  // ✅ Redirect to Menu page after login
        } else {
            res.send('Incorrect Username and/or Password!');
        }
    });
});

// ✅ New Route for Menu Page (Fix for Missing Menu Items)
app.get('/menu', (req, res) => {
    if (!req.session.loggedin) {
        return res.redirect('/login');
    }

    // Example menu items (replace with actual database query if needed)
    let menuItems = [
        { name: "Burger", price: "$5.99" },
        { name: "Pizza", price: "$8.99" },
        { name: "Pasta", price: "$7.49" },
        { name: "Coke", price: "$1.99" }
    ];

    res.render('menu', { title: 'Menu', session: req.session, menuItems });
});

// Route to display reviews along with likes and comments
app.get('/reviews', (req, res) => {
    conn.query('SELECT * FROM `submit_review` ORDER BY CreatedAt DESC', (error, reviews) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).send('Internal Server Error');
        }

        // Fetch rating counts for summary
        conn.query('SELECT Rating, COUNT(*) as count FROM `submit_review` GROUP BY Rating', (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send('Internal Server Error');
            }
            let ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
            let totalReviews = reviews.length;
            results.forEach(row => {
                let starCount = row.Rating.length;
                if (starCount >= 1 && starCount <= 5) {
                    ratingCounts[starCount] = row.count;
                }
            });

            // Fetch all comments from comments table
            conn.query('SELECT * FROM `comments` ORDER BY created_at ASC', (error2, comments) => {
                if (error2) {
                    console.error('Database error:', error2);
                    return res.status(500).send('Internal Server Error');
                }
                res.render('reviews', { reviews, session: req.session, ratingCounts, totalReviews, comments });
            });
        });
    });
});

// Route to submit a new review
app.post('/submit-review', (req, res) => {
    if (!req.session.loggedin) {
        return res.redirect('/login');
    }
    const { name, rating, comment } = req.body;
    const createdAt = new Date();
    conn.query('INSERT INTO `submit_review` (`Name`, `Rating`, `Comment`, `CreatedAt`) VALUES (?, ?, ?, ?)',
        [name, rating, comment, createdAt],
        (error) => {
            if (error) {
                console.error('Database error:', error);
                return res.status(500).send('Internal Server Error');
            }
            res.redirect('/reviews');
        });
});

// Route to like a review
app.post('/like-review', (req, res) => {
    const { review_id } = req.body;
    conn.query('UPDATE `submit_review` SET likes = likes + 1 WHERE id = ?', [review_id], (error) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).send('Internal Server Error');
        }
        res.redirect('/reviews');
    });
});

// Route to add a comment to a review
app.post('/comment-review', (req, res) => {
    const { review_id, comment } = req.body;
    if (!req.session.loggedin) {
        return res.redirect('/login');
    }
    conn.query('INSERT INTO `comments` (review_id, username, text) VALUES (?, ?, ?)',
        [review_id, req.session.username, comment],
        (error) => {
            if (error) {
                console.error('Database error:', error);
                return res.status(500).send('Internal Server Error');
            }
            res.redirect('/reviews');
        });
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(3000);
console.log('Node app is running on port 3000');
