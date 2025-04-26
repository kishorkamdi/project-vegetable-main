const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer'); // For sending emails
const router = express.Router();

const SALT_ROUNDS = 10; // Cost factor for bcrypt hashing

// --- Nodemailer Setup (Configure this properly in .env!) ---
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        // For development/testing with self-signed certs or some providers:
        // tls: {
        //     rejectUnauthorized: false
        // }
    });
    console.log("Nodemailer transporter configured.");
} else {
    console.log("Nodemailer transporter not configured (missing EMAIL_USER or EMAIL_PASS in .env).");
}
// ----------------------------------------------------

// --- Helper Functions ---
function findUserByEmail(email) {
    return global.appData.users.find(user => user.email === email);
}

function findUserById(id) {
    return global.appData.users.find(user => user.id === id);
}

function findUserByResetToken(token) {
    return global.appData.users.find(user => user.resetToken === token && user.resetTokenExpiry > Date.now());
}
// ------------------------


// GET /auth/signup - Display signup form
router.get('/signup', (req, res) => {
    if (req.session.userId) { return res.redirect('/'); } // Redirect if already logged in
    res.render('auth/signup', { pageTitle: 'Sign Up' });
});

// POST /auth/signup - Handle signup logic
router.post('/signup', async (req, res) => {
    if (req.session.userId) { return res.redirect('/'); }
    const { email, password, confirmPassword } = req.body;
    let errors = []; // Use connect-flash instead

    // Basic Validation
    if (!email || !password || !confirmPassword) {
        req.flash('error_msg', 'Please fill in all fields.');
    }
    if (password !== confirmPassword) {
        req.flash('error_msg', 'Passwords do not match.');
    }
    if (password && password.length < 6) {
        req.flash('error_msg', 'Password should be at least 6 characters.');
    }
    if (email && findUserByEmail(email)) {
        req.flash('error_msg', 'Email is already registered.');
    }

    // Check flash messages for errors
    const flashErrors = req.flash('error_msg');
    if (flashErrors.length > 0) {
        // Re-render with errors and previous input
        return res.render('auth/signup', {
            pageTitle: 'Sign Up',
            error_msg: flashErrors, // Pass flash errors to the view
            email: email, // Keep email in the form
        });
    }

    // Proceed if no errors
    try {
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const newUser = {
            id: `u${Date.now()}${Math.random().toString(36).substring(2, 7)}`, // Slightly more unique ID
            email: email,
            passwordHash: passwordHash,
            resetToken: undefined,
            resetTokenExpiry: undefined
        };
        global.appData.users.push(newUser);
        console.log('User registered:', newUser.email); // Log registration
        req.flash('success_msg', 'You are now registered and can log in.');
        res.redirect('/auth/login');
    } catch (err) {
        console.error("Signup Error:", err);
        req.flash('error_msg', 'Could not register user. Please try again.');
        res.redirect('/auth/signup');
    }
});

// GET /auth/login - Display login form
router.get('/login', (req, res) => {
     if (req.session.userId) { return res.redirect('/'); } // Redirect if already logged in
    res.render('auth/login', { pageTitle: 'Log In' });
});

// POST /auth/login - Handle login logic
router.post('/login', async (req, res) => {
    if (req.session.userId) { return res.redirect('/'); }
    const { email, password } = req.body;

    if (!email || !password) {
        req.flash('error_msg', 'Please provide email and password.');
        return res.redirect('/auth/login');
    }

    const user = findUserByEmail(email);

    if (!user) {
        // Use same generic message for non-existent user or wrong password
        req.flash('error_msg', 'Invalid credentials.');
        return res.redirect('/auth/login');
    }

    try {
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (isMatch) {
            // Password matches - Set up session
            req.session.userId = user.id; // Store user ID in session
            console.log('User logged in:', user.email);

            // Send welcome email after successful login
            if (transporter) {
                const mailOptions = {
                    from: process.env.EMAIL_FROM || '"Veggie Shop" <noreply@example.com>',
                    to: user.email,
                    subject: 'Welcome to Veggie Shop!',
                    html: `
                        <p>Dear ${user.email},</p>
                        <p>Welcome to Veggie Shop! We're glad to have you with us.</p>
                        <p>Enjoy shopping fresh and organic vegetables with us.</p>
                        <hr>
                        <p>Best regards,<br/>Veggie Shop Team</p>
                    `
                };
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error('Error sending welcome email:', error);
                    } else {
                        console.log('Welcome email sent:', info.response);
                    }
                });
            }

            // Redirect to intended page or homepage (implement redirect logic if needed)
            const redirectTo = req.session.returnTo || '/';
            delete req.session.returnTo; // Clear the stored URL
            req.flash('success_msg', 'You are logged in!');
            res.redirect(redirectTo);
        } else {
            // Password doesn't match
            req.flash('error_msg', 'Invalid credentials.');
            res.redirect('/auth/login');
        }
    } catch (err) {
        console.error("Login Error:", err);
        req.flash('error_msg', 'An error occurred during login. Please try again.');
        res.redirect('/auth/login');
    }
});

router.get('/logout', (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout Error:", err);
            if (req.flash && req.session) {
                req.flash('error_msg', 'Could not log out. Please try again.');
            }
            return res.redirect('/');
        }
        console.log('User logged out');
        res.clearCookie('connect.sid', { path: '/' });
        if (req.flash && req.session) {
            req.flash('success_msg', 'You have been logged out.');
        }
        res.redirect('/');
    });
});

// GET /auth/forgot-password - Display forgot password form
router.get('/forgot-password', (req, res) => {
    if (req.session.userId) { return res.redirect('/'); }
    res.render('auth/forgot-password', { pageTitle: 'Forgot Password' });
});

// POST /auth/forgot-password - Handle request for password reset
router.post('/forgot-password', (req, res) => {
    if (req.session.userId) { return res.redirect('/'); }
    const { email } = req.body;
    const user = findUserByEmail(email);

    // Always show a generic success message regardless of whether the user exists
    // This prevents email enumeration attacks.
    const genericSuccessMessage = 'If an account with that email exists, a password reset link has been sent.';

    if (!user) {
        console.log(`Password reset requested for non-existent email: ${email}`);
        req.flash('success_msg', genericSuccessMessage);
        return res.redirect('/auth/forgot-password');
    }

    // Generate Token
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.error('Token generation error:', err);
            req.flash('error_msg', 'Could not generate reset token. Try again.');
            return res.redirect('/auth/forgot-password');
        }
        const token = buffer.toString('hex');
        user.resetToken = token;
        user.resetTokenExpiry = Date.now() + 3600000; // Token valid for 1 hour (3600000 ms)

        // --- Send Email (Requires Nodemailer setup) ---
        if (!transporter) {
             console.error('ERROR: Nodemailer transporter not configured. Cannot send reset email.');
             // Log token/URL for testing if email can't be sent
             const resetUrl = `http://${req.headers.host}/auth/reset-password/${token}`;
             console.log(`Password reset token for ${user.email}: ${token}`);
             console.log(`Reset URL (for testing): ${resetUrl}`);
             req.flash('success_msg', `${genericSuccessMessage} (Email sending disabled - check console for test link)`);
             return res.redirect('/auth/forgot-password');
        }

        const resetUrl = `http://${req.headers.host}/auth/reset-password/${token}`;
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Veggie Shop" <noreply@example.com>',
            to: user.email,
            subject: 'Veggie Shop - Password Reset Request',
            html: `
                <p>You requested a password reset for your Veggie Shop account.</p>
                <p>Click this <a href="${resetUrl}" target="_blank">link</a> to set a new password.</p>
                <p>This link is valid for 1 hour.</p>
                <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
                <hr>
                <p><small>Link not working? Copy and paste this URL into your browser: ${resetUrl}</small></p>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending password reset email:', error);
                // Still show generic success message to user, but log the error
                req.flash('success_msg', `${genericSuccessMessage} (Error sending email - check server logs)`);
                return res.redirect('/auth/forgot-password');
            }
            console.log('Password reset email sent:', info.response);
            req.flash('success_msg', genericSuccessMessage);
            res.redirect('/auth/forgot-password');
        });
        // -------------------------------------------------
    });
});

// GET /auth/reset-password/:token - Display reset password form
router.get('/reset-password/:token', (req, res) => {
    if (req.session.userId) { return res.redirect('/'); } // Don't allow logged-in users here
    const token = req.params.token;
    const user = findUserByResetToken(token);

    if (!user) {
        req.flash('error_msg', 'Password reset token is invalid or has expired.');
        return res.redirect('/auth/forgot-password');
    }

    res.render('auth/reset-password', {
        pageTitle: 'Reset Password',
        token: token // Pass token to the form/view
    });
});

// POST /auth/reset-password/:token - Handle password reset
router.post('/reset-password/:token', async (req, res) => {
    if (req.session.userId) { return res.redirect('/'); }
    const token = req.params.token;
    const { password, confirmPassword } = req.body;
    const user = findUserByResetToken(token);

    if (!user) {
        req.flash('error_msg', 'Password reset token is invalid or has expired.');
        return res.redirect('/auth/forgot-password');
    }

    // Validation
    if (!password || !confirmPassword) {
         req.flash('error_msg', 'Please enter and confirm your new password.');
    } else if (password !== confirmPassword) {
        req.flash('error_msg', 'Passwords do not match.');
    } else if (password.length < 6) {
        req.flash('error_msg', 'Password should be at least 6 characters.');
    }

    const flashErrors = req.flash('error_msg');
    if (flashErrors.length > 0) {
        // Re-render form with errors
        return res.render('auth/reset-password', {
            pageTitle: 'Reset Password',
            token: token,
            error_msg: flashErrors // Pass flash errors
        });
    }

    // Proceed with reset
    try {
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        user.passwordHash = passwordHash;
        user.resetToken = undefined; // Clear the token
        user.resetTokenExpiry = undefined;

        console.log('Password reset successfully for:', user.email);
        req.flash('success_msg', 'Password has been reset successfully. Please log in with your new password.');
        res.redirect('/auth/login');
    } catch (err) {
        console.error("Password Reset Error:", err);
        req.flash('error_msg', 'An error occurred resetting the password. Please try again.');
        // Redirect back to reset form with the token
        res.redirect(`/auth/reset-password/${token}`);
    }
});


module.exports = router;
