const express = require('express');
const router = express.Router();

// GET / - Homepage
router.get('/', (req, res) => {
    // Maybe feature some products on the homepage
    const featuredProducts = global.appData.products.slice(0, 3);
    res.render('index', {
        pageTitle: 'Welcome to Veggie Shop!',
        products: featuredProducts
        // searchTerm is available globally via res.locals now
    });
});

// GET /products - Show all products or search results
router.get('/products', (req, res) => {
    const searchTerm = req.query.search || ''; // Get search term from query
    let filteredProducts = global.appData.products;

    if (searchTerm) {
        filteredProducts = global.appData.products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }

    res.render('products', {
        pageTitle: searchTerm ? `Search Results for "${searchTerm}"` : 'All Products',
        products: filteredProducts,
        searchTerm: searchTerm // Pass searchTerm specifically for this page if needed, though available globally
    });
});

module.exports = router;
