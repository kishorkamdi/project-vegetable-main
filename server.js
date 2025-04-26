require('dotenv').config(); // Load environment variables first
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const bodyParser = require('body-parser');

// --- In-Memory Data Stores (Replace with Database in Production) ---
const data = {
    users: [], // { id, email, passwordHash, resetToken, resetTokenExpiry }
    products: [
        { id: 'p1', name: 'Organic Carrots', price: 50.00, category: 'Root Vegetables', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTAfkBmYDd4FYMT19HdDQ3ST5MDIHAkD-MiQg&s', description: 'Fresh and crunchy organic carrots.' },
        { id: 'p2', name: 'Broccoli Florets', price: 35.00, category: 'Cruciferous Vegetables', image: 'https://ardo.com/sites/default/files/styles/teaser_square_xs/public/2023-09/b26.jpg?h=8165685c&itok=aYZ7CKRK', description: 'Nutritious broccoli florets.' },
        { id: 'p3', name: 'Ripe Tomatoes', price: 45.00, category: 'Fruiting Vegetables', image: 'https://images.unsplash.com/photo-1567306301408-9b74779a11af?auto=format&fit=crop&w=400&q=80', description: 'Juicy vine-ripened tomatoes.' },
        { id: 'p4', name: 'Spinach Bunch', price: 25.00, category: 'Leafy Greens', image: 'https://www.jiomart.com/images/product/original/590004479/spinach-paalak-1-bunch-approx-100-g-300-g-product-images-o590004479-p590004479-0-202409171906.jpg?im=Resize=(1000,1000)', description: 'Fresh green spinach.' },
        { id: 'p5', name: 'Bell Peppers (Mixed)', price: 28.00, category: 'Fruiting Vegetables', image: 'https://aanmc.org/wp-content/uploads/2023/09/bell-peppers-1200x800-1-1024x683.jpg', description: 'Colorful mix of bell peppers.' },
        { id: 'p6', name: 'Fresh Cucumbers', price: 48.20, category: 'Fruiting Vegetables', image: 'https://4eaters.in/images/data/products/full/cucumber-81f0305c-b074-4e92-a389-e2bebe659b82.jpg', description: 'Cool and crisp cucumbers.' },
        { id: 'p7', name: 'Sweet Corn', price: 60.50, category: 'Grains and Cereals', image: 'https://www.debon.co.in/cdn/shop/products/American-Sweet-Corn.jpg?v=1672122718', description: 'Sweet and juicy corn on the cob.' },
        { id: 'p8', name: 'Red Onions', price: 90.80, category: 'Bulb Vegetables', image: 'https://m.media-amazon.com/images/I/41uWBT2Hw-L._AC_UF1000,1000_QL80_.jpg', description: 'Sharp and flavorful red onions.' },
        { id: 'p9', name: 'Kale Leaves', price: 70.00, category: 'Leafy Greens', image: 'https://media.post.rvohealth.io/wp-content/uploads/2020/09/benefits-of-kale-732x549-thumbnail.jpg', description: 'Nutrient-rich kale leaves.' },
        { id: 'p10', name: 'Zucchini', price: 40.80, category: 'Fruiting Vegetables', image: 'https://cdn.shopaccino.com/rootz/products/picture11-833982_m.jpg?v=558', description: 'Fresh green zucchini.' },
        { id: 'p11', name: 'Cauliflower', price: 60.20, category: 'Cruciferous Vegetables', image: 'https://m.media-amazon.com/images/I/91EdPVzD99L._AC_UF1000,1000_QL80_.jpg', description: 'White and fresh cauliflower.' },
        { id: 'p12', name: 'Red Cabbage', price: 30.90, category: 'Cruciferous Vegetables', image: 'https://samsgardenstore.com/cdn/shop/files/RedCabbageDesiVegetableSeeds_53f55bc3-d671-4fce-a908-0639a2d0fedc.webp?v=1726217841', description: 'Fresh red cabbage.' },
        { id: 'p13', name: 'Green Beans', price: 49.10, category: 'Legumes', image: 'https://media.post.rvohealth.io/wp-content/uploads/2020/06/green-beans-732x549-thumbnail.jpg', description: 'Fresh green beans.' },
        { id: 'p14', name: 'Eggplant', price: 62.50, category: 'Fruiting Vegetables', image: 'https://yarrowayfarm.com/cdn/shop/articles/baigan.webp?v=1702384187&width=1100', description: 'Fresh eggplants.' },
        { id: 'p15', name: 'Brussels Sprouts', price: 39.00, category: 'Cruciferous Vegetables', image: 'https://bcfresh.ca/wp-content/uploads/2021/11/Brussels-sprouts.jpg', description: 'Fresh Brussels sprouts.' },
        { id: 'p16', name: 'Asparagus', price: 55.50, category: 'Stem Vegetables', image: 'https://www.feastingathome.com/wp-content/uploads/2024/03/roasted-asparagus-3.jpg', description: 'Fresh asparagus.' },
        { id: 'p17', name: 'Leeks', price: 62.20, category: 'Bulb Vegetables', image: 'https://images.squarespace-cdn.com/content/v1/57f7c21be3df28e37ffbbc26/54b0ea68-6f9d-4962-a93b-9eaf81d173cb/2024-08-07_EB-Recipes-0881.jpg', description: 'Fresh leeks.' },
        { id: 'p18', name: 'Green Peas', price: 25.80, category: 'Legumes', image: 'https://www.jiomart.com/images/product/original/590004083/green-peas-500-g-product-images-o590004083-p590004083-0-202503171105.jpg?im=Resize=(420,420)', description: 'Fresh green peas.' },
        { id: 'p19', name: 'Sweet Potatoes', price: 58.00, category: 'Root Vegetables', image: 'https://cdn.prod.website-files.com/63ed08484c069d0492f5b0bc/65a6d441e99ae945026bb843_sweet-potato.jpg', description: 'Fresh sweet potatoes.' },
        { id: 'p20', name: 'Radishes', price: 38.50, category: 'Root Vegetables', image: 'https://cleananddelicious.com/wp-content/uploads/2021/04/radish_101.hero_.jpg', description: 'Fresh radishes.' },
        { id: 'p21', name: 'Celery', price: 35.70, category: 'Stem Vegetables', image: 'https://www.innerwest.nsw.gov.au/Images/UserUploadedImages/33161/celery-cropped.jpg', description: 'Fresh celery.' },
        { id: 'p22', name: 'Cabbage', price: 30.90, category: 'Cruciferous Vegetables', image: 'https://www.veggovilla.com/img/productimg/cabbage_0_5-240.webp', description: 'Fresh cabbage.' },
        { id: 'p23', name: 'Mushrooms', price: 70.50, category: 'Fungi', image: 'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/mushroom_title-8e7c267.jpg?quality=90&resize=556,505', description: 'Fresh mushrooms.' },
        { id: 'p24', name: 'Pumpkin', price: 40.00, category: 'Fruiting Vegetables', image: 'https://www.healthyfood.com/wp-content/uploads/2017/03/What-to-do-with-pumpkin.jpg', description: 'Fresh pumpkin.' },
        { id: 'p25', name: 'Garlic', price: 30.50, category: 'Bulb Vegetables', image: 'https://www.jiomart.com/images/product/original/590003532/indian-garlic-200-g-product-images-o590003532-p590003532-0-202408070949.jpg?im=Resize=(1000,1000)', description: 'Fresh garlic.' },
        { id: 'p26', name: 'Green Onions', price: 60.00, category: 'Bulb Vegetables', image: 'https://preview.redd.it/alright-yall-which-side-are-you-on-are-these-green-onions-v0-j4k1xekpsvje1.jpeg?auto=webp&s=71a13f526ababa79edc3cf0744dc450b8e828652', description: 'Fresh green onions.' },
        { id: 'p27', name: 'Artichokes', price: 45.80, category: 'Flower Vegetables', image: 'https://whiteonricecouple.com/recipe/images/grilled-artichoke-485-1.jpg', description: 'Fresh artichokes.' },
        { id: 'p28', name: 'Beets', price: 50.90, category: 'Root Vegetables', image: 'https://deliciouslyorganic.net/wp-content/uploads/2009/04/iStock_000012520235Small.jpg', description: 'Fresh beets.' },
        { id: 'p29', name: 'Chili Peppers', price: 40.20, category: 'Fruiting Vegetables', image: 'https://media.post.rvohealth.io/wp-content/uploads/2020/08/chili-peppers-732x549-thumbnail.jpg', description: 'Fresh chili peppers.' },
        { id: 'p30', name: 'Okra', price: 40.50, category: 'Fruiting Vegetables', image: 'https://www.veggycation.com.au/siteassets/veggycationvegetable/okra.jpg', description: 'Fresh okra.' },
        { id: 'p31', name: 'Leek', price: 35.00, category: 'Bulb Vegetables', image: 'https://www.jiomart.com/images/product/original/590003905/leek-250-g-product-images-o590003905-p590034371-0-202409271101.jpg?im=Resize=(420,420)', description: 'Fresh leek.' },
        { id: 'p32', name: 'Mint', price: 25.50, category: 'Root Vegetables', image: 'https://organicmandya.com/cdn/shop/files/MintLeaves.jpg?v=1721375044&width=1024', description: 'Fresh Mint' },
        
    ],
    carts: {}, // { userId: [{ productId, quantity }] }
    orders: [] // { orderId, userId, items: [{ productId, name, price, quantity }], total, location, timestamp }
};
// Make data accessible globally (for simplicity in this example)
// In a real app, pass data through routes or use a proper data layer/service.
global.appData = data;
// --------------------------------------------------------------------

const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/order');
const indexRoutes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware Setup ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: false })); // Parse URL-encoded bodies
app.use(bodyParser.json()); // Parse JSON bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret_please_change', // Use env variable!
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // Example: 1 day session
    // store: // Add a session store for production (e.g., connect-mongo, connect-redis)
}));

// Flash Messages
app.use(flash());

// Global variables for views
app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.userId ? true : false;
    res.locals.currentUser = req.session.userId ? global.appData.users.find(u => u.id === req.session.userId) : null; // Basic user info
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error'); // For passport compatibility if added later
    res.locals.cartItemCount = 0;
    if (req.session.userId && global.appData.carts[req.session.userId]) {
        res.locals.cartItemCount = global.appData.carts[req.session.userId].reduce((sum, item) => sum + item.quantity, 0);
    }
    // Pass searchTerm globally for the nav search bar persistence
    res.locals.searchTerm = req.query.search || '';
    next();
});

// --- Routes ---
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/cart', cartRoutes);
app.use('/order', orderRoutes);

// --- Basic 404 Handler ---
app.use((req, res, next) => {
    res.status(404).render('404', { pageTitle: 'Page Not Found' }); // Create a 404.ejs view
});

// --- Basic Error Handler ---
app.use((error, req, res, next) => {
    console.error("Global Error Handler:", error);
    // Ensure flash messages aren't lost on error page render if needed
    res.locals.error_msg = req.flash('error_msg');
    res.status(500).render('500', { pageTitle: 'Server Error' }); // Create a 500.ejs view
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (process.env.NODE_ENV !== 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.includes('change_me'))) {
        console.warn('\n**************** WARNING ****************');
        console.warn('Using default or weak SESSION_SECRET.');
        console.warn('Set a strong, random secret in your .env file for security!');
        console.warn('*****************************************\n');
    }
    // Add a check for email config if needed
    if (!process.env.EMAIL_USER && process.env.NODE_ENV !== 'production') {
         console.warn('NOTE: Email configuration not found in .env. Password reset emails will not be sent.');
    }
});
