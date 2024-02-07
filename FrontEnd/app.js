const express = require('express');
const { engine } = require('express-handlebars');
const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access');
const Handlebars = require('handlebars');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
require('dotenv').config();
const helpers = require('./helpers/handlebars');

const resetDB = false; // DB RESET SWITCH

const app = express();
// Handlebars Middleware
/*
* 1. Handlebars is a front-end web templating engine that helps to create dynamic web pages using variables
* from Node JS.
*
* 2. Node JS will look at Handlebars files under the views directory
*
* 3. 'defaultLayout' specifies the main.handlebars file under views/layouts as the main template
*
* */
app.engine('handlebars', engine({
	helpers: helpers,
	handlebars: allowInsecurePrototypeAccess(Handlebars),
	defaultLayout: 'main' // Specify default template views/layout/main.handlebar 
}));
app.set('view engine', 'handlebars');

// Express middleware to parse HTTP body in order to read HTTP data
app.use(express.urlencoded({
	extended: false
}));
app.use(express.json());

// Creates static folder for publicly accessible HTML, CSS and Javascript files
app.use(express.static(path.join(__dirname, 'public')));

// Library to use MySQL to store session objects
const MySQLStore = require('express-mysql-session');
var options = {
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	user: process.env.DB_USER,
	password: process.env.DB_PWD,
	database: process.env.DB_NAME,
	clearExpired: true,
	// The maximum age of a valid session; milliseconds:
	expiration: 3600000, // 1 hour = 60x60x1000 milliseconds 
	// How frequently expired sessions will be cleared; milliseconds: 
	checkExpirationInterval: 1800000 // 30 min 
};

const DBConnection = require('./config/DBConnection');
DBConnection.setUpDB(resetDB) // To set up database with new tables


// Enables session to be stored using browser's Cookie ID
app.use(cookieParser());

// To store session information. By default it is stored as a cookie on browser
app.use(session({
	key: process.env.APP_SECRET,
	secret: 'ymedoruc',
	// store: new MySQLStore(options),
	resave: false,
	saveUninitialized: false,
}));

// Messaging libraries
const flash = require('connect-flash');
app.use(flash());
const flashMessenger = require('flash-messenger');
app.use(flashMessenger.middleware);

// Passport Config
const passport = require('passport');
const passportConfig = require('./config/passportConfig');
passportConfig.localStrategy(passport);

// Initilize Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Place to define global variables
app.use(function (req, res, next) {
	res.locals.messages = req.flash('message');
	res.locals.errors = req.flash('error');
	res.locals.user = req.user || null;
	next();
});

// Error Handling


// mainRoute is declared to point to routes/main.js
const mainRoute = require('./routes/main');
const dairyRoute = require('./routes/dairy');
const userRoute = require('./routes/user');

// Any URL with the pattern ‘/*’ is directed to routes/main.js
app.use('/', mainRoute);
app.use('/dairy', dairyRoute);
app.use('/user', userRoute);

// The 404 Route
app.use(function (req, res, next) {
	let title = "Page not Found"
	res.status(404);

	if (req.accepts('html')) {
		res.render('404', { url: req.url, title });
		return;
	}
});

const port = process.env.PORT

app.listen(port, () => {
	console.log(`Server started on http://localhost:${port}`);
});

// adminAcc =
// 	[
// 		['nicholasong75@gmail.com', 1, 'n1cholas.ong', '$2a$10$sUm1yYEeoTRYxTEDyxqVFuaETT4mMBk0vYgPgrJrgVQ98YRP9NBRm', 'Nicholas', 'Ong', 'M', null, 'SG', 'productivity,artsncrafts,langauge', null, null, 1],
// 		['Nat@gmail.com', 1, 'nat', '$2a$10$kFXNArrd0alYlG/zCzGfz./0m86G4Amgdub6656CHR4i.Aysc8NUi', 'Nat', 'Lee', 'M', '1995-09-30', 'US', 'photography,productivity,langauge', null, null, 1],
// 		['lucaslee@gmail.com', 1, 'Xepvoid', '$2a$10$6fwMyC0jwW34PznlgWM8wOoyx1ritkY38XnklD4g4QLLyxoErxiyy', 'Lucas', 'Lee', 'M', '2004-01-17', 'SG', 'programming,productivity,selfhelp', null, null, 1],
// 		['Kiat0878@gmail.com', 1, 'Kiat10', '$2a$10$jCtrCrWCNFhXI9kpEOgEeeTHxJi5yLFO2Bfkg.fZ2bJ2rx1qOD6mS', 'Kai Kiat', 'Lo', null, '2002-01-31', 'AT', 'programming,productivity,langauge,selfhelp', null, null, 1],
// 		['johnsmith123@curodemy.com', 1, 'johnsmith23', '$2a$10$MSYP/5u38iPwbk9gqyeuAeoN7cDzQwy32x9paLMu13l1fiewJ5hhS', 'John', 'Smith', '', null, '', null, null, null, 1]
// 	];
