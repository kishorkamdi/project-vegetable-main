// Middleware to check if the user is logged in
function isLoggedIn(req, res, next) {
    if (req.session.userId) {
        return next(); // User is logged in, proceed
    }
    req.flash('error_msg', 'Please log in to view this resource.');
    res.redirect('/auth/login');
}

module.exports = { isLoggedIn };
