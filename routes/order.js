const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/authMiddleware');

// Helper to get product details
function getProductById(productId) {
    return global.appData.products.find(p => p.id === productId);
}

// Helper function to get cart details (used in both GET and POST)
function getCartDetails(userId) {
    const userCart = global.appData.carts[userId] || [];
    let cartTotal = 0;
    const cartItemsDetails = userCart.map(item => {
        const product = getProductById(item.productId);
        if (product) {
            const itemTotal = product.price * item.quantity;
            cartTotal += itemTotal;
            return {
                ...product,
                quantity: item.quantity,
                itemTotal: itemTotal.toFixed(2)
            };
        }
        return null;
    }).filter(item => item !== null);

    return { cartItemsDetails, cartTotal: cartTotal.toFixed(2), userCart };
}


// GET /order/checkout - Display checkout page (Requires Login)
router.get('/checkout', isLoggedIn, (req, res) => {
    const userId = req.session.userId;
    const { cartItemsDetails, cartTotal, userCart } = getCartDetails(userId);

    if (userCart.length === 0) {
        req.flash('error_msg', 'Your cart is empty. Add items before checking out.');
        return res.redirect('/cart');
    }

    res.render('checkout', {
        pageTitle: 'Checkout',
        cartItems: cartItemsDetails,
        cartTotal: cartTotal
        // Pass potential validation errors or previous input if redirected back
        // location: req.flash('location')?.[0] || '' // Example if needed
    });
});

// POST /order/place - Place the order (Requires Login)
router.post('/place', isLoggedIn, (req, res) => {
    const userId = req.session.userId;
    const { location } = req.body; // Get location from form
    const { cartItemsDetails, cartTotal, userCart } = getCartDetails(userId); // Get current cart state

    // --- Validation ---
    if (!location || location.trim() === '') {
        req.flash('error_msg', 'Please provide a delivery location.');
        // Re-render checkout with cart data and error
        return res.render('checkout', {
            pageTitle: 'Checkout',
            cartItems: cartItemsDetails,
            cartTotal: cartTotal,
            error_msg: req.flash('error_msg'), // Pass the flash message
            location: location // Keep entered location in form
        });
    }

    if (userCart.length === 0) {
        // Should be caught by GET /checkout, but double-check
        req.flash('error_msg', 'Your cart is empty. Cannot place order.');
        return res.redirect('/cart');
    }
    // --- End Validation ---


    // Prepare order items (re-calculate total server-side for security)
    let finalOrderTotal = 0;
    const orderItems = userCart.map(item => {
        const product = getProductById(item.productId);
        // Ensure product still exists and has a valid price
        if (product && typeof product.price === 'number') {
            finalOrderTotal += product.price * item.quantity;
            return {
                productId: product.id,
                name: product.name,
                price: product.price, // Store price at time of order
                quantity: item.quantity,
                image: product.image // Store image for confirmation page
            };
        }
        // If a product became invalid between checkout view and place order
        console.error(`Invalid product found during order placement: ${item.productId}`);
        return null;
    }).filter(item => item !== null);

    // If any item was invalid, stop the order
    if (orderItems.length !== userCart.length) {
        req.flash('error_msg', 'Some items in your cart became unavailable. Please review your cart and try again.');
        return res.redirect('/cart');
    }

    // Create the order object
    const newOrder = {
        orderId: `ord-${Date.now()}-${userId.substring(0, 4)}`, // More unique ID
        userId: userId,
        items: orderItems,
        total: finalOrderTotal.toFixed(2),
        location: location.trim(), // Store the provided location
        timestamp: new Date()
        // status: 'Pending' // Add order status later if needed
    };

    // Save the order (in memory)
    global.appData.orders.push(newOrder);

    // IMPORTANT: Clear the user's cart after placing the order
    delete global.appData.carts[userId]; // Or set global.appData.carts[userId] = [];

    console.log(`Order placed: ${newOrder.orderId} by user ${userId} for $${newOrder.total}`);
    // console.log('Current Orders:', JSON.stringify(global.appData.orders));

    // Store order details briefly in session to display on confirmation page
    // Only store necessary info to avoid large session objects
    req.session.lastOrderId = newOrder.orderId;

    req.flash('success_msg', 'Order placed successfully! Thank you.');
    res.redirect('/order/confirmation');
});

// GET /order/confirmation - Show order confirmation page (Requires Login)
router.get('/confirmation', isLoggedIn, (req, res) => {
    const lastOrderId = req.session.lastOrderId;
    let order = null;

    if (!lastOrderId) {
        // If user directly navigates here or session expired before viewing
        req.flash('error_msg', 'No recent order confirmation found in this session.');
        return res.redirect('/'); // Redirect to homepage or orders page
    }

    // Find the order from our "database"
    order = global.appData.orders.find(o => o.orderId === lastOrderId && o.userId === req.session.userId);

    // Clear the order ID from session after attempting to display it
    delete req.session.lastOrderId;

    if (!order) {
         // Order might have been placed in a previous session or data lost
         console.warn(`Could not find order ${lastOrderId} for user ${req.session.userId} for confirmation page.`);
         req.flash('error_msg', 'Could not retrieve details for your recent order.');
         return res.redirect('/'); // Or redirect to an "My Orders" page if implemented
    }

    res.render('order-confirmation', {
        pageTitle: 'Order Confirmation',
        order: order
    });
});



// GET /order/history - Show order history page (Requires Login)
router.get('/history', isLoggedIn, (req, res) => {
    const userId = req.session.userId;
    // Filter orders for the logged-in user
    const userOrders = global.appData.orders.filter(order => order.userId === userId);

    res.render('history', {
        pageTitle: 'Order History',
        orders: userOrders
    });
});

module.exports = router;
