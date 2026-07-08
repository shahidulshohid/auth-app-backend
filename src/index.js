const express = require('express');
const dotenv = require('dotenv');

dotenv.config(); // .env load করে

const app = express();
app.use(express.json()); // JSON body read korar jonno

// Session middleware (passport এর জন্য দরকার)
// const passport = require('./utils/passport');
// app.use(passport.initialize());

// Routes
const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
