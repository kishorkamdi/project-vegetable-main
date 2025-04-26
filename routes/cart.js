const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/authMiddleware');

// Helper to get product details
function getProductById(productId) {
    return global.appData.products.find(p => p.id === productId);
}

// GET /cart - View Cart (Requires Login)
router.get('/', isLoggedIn, (req, res) => {
    const userId = req.session.userId;
    const userCart = global.appData.carts[userId] || [];
    let cartTotal = 0;

    const cartItemsDetails = userCart.map(item => {
        const product = getProductById(item.productId);
        if (product) {
            const itemTotal = product.price * item.quantity;
            cartTotal += itemTotal;
            return {
                ...product, // Spread product details (id, name, image, description, price)
                quantity: item.quantity,
                itemTotal: itemTotal.toFixed(2)
            };
        }
        // If a product associated with a cart item is somehow deleted, filter it out
        console.warn(`Cart item product not found: ${item.productId} for user ${userId}`);
        return null;
    }).filter(item => item !== null); // Remove nulls if any product wasn't found

    // If filtering removed items, update the cart in memory (optional but good practice)
    if (cartItemsDetails.length !== userCart.length) {
        global.appData.carts[userId] = cartItemsDetails.map(item => ({ productId: item.id, quantity: item.quantity }));
        console.log(`Cart updated for user ${userId} due to missing product(s).`);
    }

    res.render('cart', {
        pageTitle: 'Your Shopping Cart',
        cartItems: cartItemsDetails,
        cartTotal: cartTotal.toFixed(2)
    });
});

// POST /cart/add - Add item to cart (Requires Login)
router.post('/add', isLoggedIn, (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.session.userId;
    const numQuantity = parseInt(quantity, 10) || 1; // Default to 1 if invalid or missing

    if (!productId || numQuantity <= 0) {
        req.flash('error_msg', 'Invalid product or quantity.');
        return res.redirect(req.headers.referer || '/products'); // Redirect back
    }

    const product = getProductById(productId);
    if (!product) {
        req.flash('error_msg', 'Product not found.');
        return res.redirect(req.headers.referer || '/products');
    }

    // Initialize cart for user if it doesn't exist
    if (!global.appData.carts[userId]) {
        global.appData.carts[userId] = [];
    }

    const existingCartItemIndex = global.appData.carts[userId].findIndex(item => item.productId === productId);

    if (existingCartItemIndex > -1) {
        // Item already in cart, update quantity
        global.appData.carts[userId][existingCartItemIndex].quantity += numQuantity;
    } else {
        // Add new item to cart
        global.appData.carts[userId].push({ productId, quantity: numQuantity });
    }

    console.log(`User ${userId} added ${numQuantity} of ${productId} (${product.name}) to cart.`);
    // console.log('Current Carts:', JSON.stringify(global.appData.carts)); // Log cart state

    req.flash('success_msg', `${numQuantity} x ${product.name} added to cart!`);
    res.redirect(req.headers.referer || '/products'); // Redirect back to the page they were on
});

// POST /cart/update - Update item quantity (Requires Login)
router.post('/update', isLoggedIn, (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.session.userId;
    const numQuantity = parseInt(quantity, 10);

    if (!productId || isNaN(numQuantity) || numQuantity < 0) { // Allow 0 quantity for removal via update
        req.flash('error_msg', 'Invalid product or quantity.');
        return res.redirect('/cart');
    }

    if (!global.appData.carts[userId]) {
        // Should not happen if they are on the cart page, but good check
        req.flash('error_msg', 'Your cart is empty or could not be found.');
        return res.redirect('/cart');
    }

    const itemIndex = global.appData.carts[userId].findIndex(item => item.productId === productId);

    if (itemIndex > -1) {
        const productName = getProductById(productId)?.name || 'Item';
        if (numQuantity === 0) {
            // Remove item if quantity is 0
            global.appData.carts[userId].splice(itemIndex, 1);
            req.flash('success_msg', `${productName} removed from cart.`);
            console.log(`User ${userId} removed ${productId} via update.`);
        } else {
            // Update quantity
            global.appData.carts[userId][itemIndex].quantity = numQuantity;
            req.flash('success_msg', `${productName} quantity updated to ${numQuantity}.`);
            console.log(`User ${userId} updated cart for ${productId}. New quantity: ${numQuantity}`);
        }
    } else {
        req.flash('error_msg', 'Item not found in your cart to update.');
    }

    res.redirect('/cart');
});

// POST /cart/remove - Remove item from cart (Requires Login)
router.post('/remove', isLoggedIn, (req, res) => {
    const { productId } = req.body;
    const userId = req.session.userId;

    if (!productId) {
        req.flash('error_msg', 'Invalid product specified for removal.');
        return res.redirect('/cart');
    }

    if (!global.appData.carts[userId]) {
        req.flash('error_msg', 'Your cart is already empty.');
        return res.redirect('/cart');
    }

    const initialLength = global.appData.carts[userId].length;
    const productName = getProductById(productId)?.name || 'Item'; // Get name for message

    // Filter out the item to remove
    global.appData.carts[userId] = global.appData.carts[userId].filter(item => item.productId !== productId);

    if (global.appData.carts[userId].length < initialLength) {
        req.flash('success_msg', `${productName} removed from cart.`);
        console.log(`User ${userId} removed ${productId} from cart.`);
    } else {
        // This case means the item wasn't found, though the update logic might handle this better
        req.flash('error_msg', 'Item not found in your cart to remove.');
    }

    res.redirect('/cart');
});


module.exports = router;
