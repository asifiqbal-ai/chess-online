// modules ===================================================================
var express        = require('express');
var app            = express();
var socketIO       = require('socket.io');
var bodyParser     = require('body-parser');
var cookieParser   = require('cookie-parser');
var methodOverride = require('method-override');
var expressSession = require('express-session');
var connectFlash   = require('connect-flash');
var mongoose       = require('mongoose');
var passport       = require('passport');
var authentication = require('./app/authentication');
var routes         = require('./app/routes');
var sockets        = require('./app/sockets');


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


// set up templating engine (jade) ===========================================
app.set('views', './app/views');
app.set('view engine', 'jade');


// express middleware ========================================================
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(sessionMiddleware);
app.use(connectFlash());
app.use(passportInitialize);
app.use(passportSession);
app.use('/app', routes.api());
app.use('/', routes.main());


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
    });

    sockets(socket, activeSockets);
});


// random stuff (development only - this will be implemented formally) =======
var User = require('./app/models/user');

User.remove({}, function(err) {
    console.log("cleared User collection");

    var Ahmed = new User({
        first_name: "ahmed",
        last_name: "mustafa",
        username: "ahmedakzm",
        email: "ahmed.akzm@gmail.com",
        password: "ahmedahmed",
        friends: []
    });

    Ahmed.save(function(err){
        var Basil = new User({
            first_name: "basil",
            last_name: "mustafa",
            username: "basilakzm",
            email: "basil@gmail.com",
            password: "basilbasil",
            friends: [Ahmed]
        });

        Basil.save(function(err){
            console.log("Initialized mock users {Ahmed} and {Basil}");
            Ahmed.friends.push(Basil);
            Ahmed.save(function(err) {});
        });
    });
});

