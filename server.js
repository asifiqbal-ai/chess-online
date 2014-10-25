// modules ===================================================================
var express        = require('express');
var app            = express();
var bodyParser     = require('body-parser');
var cookieParser   = require('cookie-parser');
var methodOverride = require('method-override');
var expressSession = require('express-session');
var mongoose       = require('mongoose');
var passport       = require('passport');
var authentication = require('./app/authentication');


// database ==================================================================
var db = require('./app/config/db');
mongoose.connect(db.url);


// configure passport ========================================================
authentication(passport);


// middleware ================================================================
SECRET_KEY = 'SOME_SECRET_KEY'; // In production, this won't be stored in the 
                                // repository. I will most likely use an 
                                // environment variable to set this variable.

app.use(express.static(__dirname + '/public'));
app.use(cookieParser()); // *** Should this use the SECRET_KEY too? ***
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(expressSession({secret: SECRET_KEY, saveUninitialized: true, resave: true}));
app.use(passport.initialize());
app.use(passport.session());


// routes ====================================================================
//require('./app/routes')(app); // configure our routes 
app.get('/index', function(req, res) {
    console.log("\n==============");
    console.log(req.user);
    console.log(req.session);
    res.sendfile('./public/views/index.html');
});

app.get('/failed', function(req, res) {
    console.log("\n==============");
    console.log(req.user);
    console.log(req.session);
    res.send("AUTHENTICATION FAILED ::: " + req.isAuthenticated());
});

app.get('/success', function(req, res) {
    console.log("\n==============");
    console.log(req.user);
    console.log(req.session);
    res.send("AUTHENTICATION SUCCEEDED ::: " + req.isAuthenticated());
});
 
app.post('/login',
    passport.authenticate('local', { successRedirect: '/success',
                                     failureRedirect: '/failed' })
);


// start server ==============================================================
app.listen(process.env.PORT || 8080);




// random stuff (development only - this will be implemented formally) =======
var User = require('./app/models/user');

new User({
    first_name: "ahmed",
    last_name: "mustafa",
    username: "ahmedakzm",
    email: "ahmed.akzm@gmail.com",
    password: "ahmedahmed"
}).save(function(err) {});