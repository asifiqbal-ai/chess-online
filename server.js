// modules ===================================================================
var express        = require('express');
var app            = express();
var socketIO       = require('socket.io');
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
var passportInitialize = passport.initialize();
var passportSession = passport.session();


// set up express session ====================================================
var sessionMiddleware = expressSession({
    secret: 'SOME_SECRET_KEY', // This will become an environment variable later
    saveUninitialized: true,
    resave: true
});


// express middleware ========================================================
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(sessionMiddleware);
app.use(passportInitialize);
app.use(passportSession);


// configure routes ==========================================================
//require('./app/routes')(app); // configure our routes 
app.get('/index', function(req, res) {
    res.sendfile('./public/views/index.html');
});

app.get('/failed', function(req, res) {
    res.send("AUTHENTICATION FAILED ::: " + req.isAuthenticated());
});

app.get('/success', function(req, res) {
    res.send("AUTHENTICATION SUCCEEDED ::: " + req.isAuthenticated());
});
 
app.post('/login',
    passport.authenticate('local', { successRedirect: '/index',
                                     failureRedirect: '/failed' })
);


// start server ==============================================================
var httpServer = app.listen(process.env.PORT || 8080);


// set up socket.io ==========================================================
var sio = socketIO(httpServer);
var activeSockets = {/* maps user.id --> socket */};

sio.use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res, next);
});

sio.use(function(socket, next) {
    passportInitialize(socket.request, socket.request.res, next);
});

sio.use(function(socket, next) {
    passportSession(socket.request, socket.request.res, next);
});

sio.use(function(socket, next) {
    if(socket.request.isAuthenticated()) {
        next();
    } else {
        next(new Error("unauthenticated session"));
    }
});

sio.on("connection", function(socket) {
    activeSockets[socket.request.user.id] = socket;

    socket.on('disconnect', function() {
        delete activeSockets[socket.request.user.id];
        console.error(socket.request.user.id + " has disconnected!");
    });

    // Implement other socket activity here
});


// random stuff (development only - this will be implemented formally) =======
var User = require('./app/models/user');

new User({
    first_name: "ahmed",
    last_name: "mustafa",
    username: "ahmedakzm",
    email: "ahmed.akzm@gmail.com",
    password: "ahmedahmed"
}).save(function(err) {});

new User({
    first_name: "ahmed",
    last_name: "mustafa",
    username: "ahmedakzm2",
    email: "ahmed.akzm2@gmail.com",
    password: "ahmedahmed"
}).save(function(err) {});