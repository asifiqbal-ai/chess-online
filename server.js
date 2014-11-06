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
var passportUpdateUser = function(req, res, next) {
    if(req.isAuthenticated()) {
        User.findById(req.session.passport.user, function(err, user) {
            req.user = user;
            next();
        });
    } else {
        next();
    }
};


// set up express session ====================================================
var sessionMiddleware = expressSession({
    secret: 'SOME_SECRET_KEY', // This will be an environment variable later
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
app.use(passportUpdateUser);


// configure routes ==========================================================
routes.configure(app);


// start server ==============================================================
var httpServer = app.listen(process.env.PORT || 8080);


// set up sockets.io =========================================================
var sio = socketIO(httpServer);
var activeSocketsCount = {/* counts active sockets per user */};
sockets.initialize(sio);

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
    var user = socket.request.user;

    if(!(user.id in activeSocketsCount))
        activeSocketsCount[user.id] = 0;
    activeSocketsCount[user.id] += 1;
    
    if(activeSocketsCount[user.id] === 1) {
        user.online = true;
        user.save(function() {
            sockets.userConnected(sio, socket, user);
        });
    }

    socket.on('disconnect', function() {
        activeSocketsCount[user.id] -= 1;
        if(!activeSocketsCount[user.id]) {
            user.online = false;
            user.save(function() {
                sockets.userDisconnected(sio, socket, user);
            });
        }
    });

    sockets.onConnection(sio, socket, user);
});


// random stuff (development only - this will be implemented formally) =======
var User = require('./app/models/user');

User.remove({}, function(err) {
    console.log("cleared User collection");

    var SomeOtherDude = new User({
        first_name: "some",
        last_name: "other",
        username: "dude",
        email: "dude@gmail.com",
        password: "dudedude",
        friends: []
    });

    var Ahmed = new User({
        first_name: "ahmed",
        last_name: "mustafa",
        username: "ahmedakzm",
        email: "ahmed.akzm@gmail.com",
        password: "ahmedahmed",
        friends: []
    });

    SomeOtherDude.sent_friend_requests.push(Ahmed);
    Ahmed.recv_friend_requests.push(SomeOtherDude);

    SomeOtherDude.save(function() {
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
                Ahmed.friends.push(Basil);
                Ahmed.save(function(err) {

                });
            });
        });
    });
});

