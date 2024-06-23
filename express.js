const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const bcrypt = require('bcrypt');
const path = require('path');
// firebase-admin.js
const admin = require('firebase-admin');
const serviceAccount = require('./key.json'); // Path to your key.json file

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports = { admin, db };


const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
    res.render('login', { errorMessage: null });
});

app.get('/login', (req, res) => {
    res.render('login', { errorMessage: null });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userRef = await db.collection('users').doc(email).get();

        if (!userRef.exists) {
            res.render('login', { errorMessage: 'User not found. Please sign up.' });
            return;
        }

        const user = userRef.data();
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
            res.redirect('/search'); // Redirect to search page after successful login
        } else {
            res.render('login', { errorMessage: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/signup', (req, res) => {
    res.render('signup', { errorMessage: null });
});

app.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Check if the user already exists
        const userRef = await db.collection('users').doc(email).get();

        if (userRef.exists) {
            res.render('signup', { errorMessage: 'User already exists. Please log in.' });
            return;
        }

        // If user does not exist, proceed with creating a new user
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.collection('users').doc(email).set({
            email: email,
            password: hashedPassword
        });

        console.log('New user created with email:', email);

        res.redirect('/login'); // Redirect to login page after successful signup
    } catch (error) {
        console.error('Error signing up:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/search', (req, res) => {
    res.render('search', { query: '', errorMessage: null });
});

app.post('/search', async (req, res) => {
    const { query } = req.body;
    try {
        // Replace 'YOUR_GOOGLE_BOOKS_API_KEY' with your actual Google Books API key
        const GOOGLE_BOOKS_API_KEY = 'AIzaSyBOyyzDmeQaR-oYb3-ve5Vk-fiV6eONkRU';
        const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${GOOGLE_BOOKS_API_KEY}`;
        const response = await axios.get(apiUrl);
        
        const books = response.data.items; // Array of book items
        if (!books || books.length === 0) {
            // No results found
            res.render('search_results', { query, errorMessage: `No results found for "${query}"` });
        } else {
            // Render search results with books
            res.render('search_results', { query, books, errorMessage: null });
        }
    } catch (error) {
        console.error('Error searching for books:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
