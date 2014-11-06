var User = require('./models/user');
var LocalStrategy = require('passport-local').Strategy;


module.exports = function(passport) {
    passport.serializeUser(function(user, next) {
        next(null, user.id);
    });

    passport.deserializeUser(function(id, next) {
        User.findById(id, next);
    });

    passport.use(new LocalStrategy(function(id, password, next) {
        User.findOneExact(id, function(err, user) {
            if(err) {
                next(null, false, {message: "Error occured while processing query"});
            } else if(!user) {
                next(null, false, {message: "Incorrect username or email"});
            } else if(user.isCorrectPassword(password)) {
                next(null, user);
            } else {
                next(null, false, {message: "Incorrect password"});
            }
        });
    }));
};