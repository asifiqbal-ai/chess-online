var User = require('./models/user');
var LocalStrategy = require('passport-local').Strategy;

var getUser = function(id, callback) {
    User.findOne({$or: [{username: id},{email: id}]}, callback);
};

module.exports = function(passport) {
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        User.findById(id, done);
    });

    passport.use(new LocalStrategy(function(id, password, done) {
        getUser(id, function(err, user) {
            if(err) {
                return done(null, false, {message: "Error occured while processing query"});
            } else if(!user) {
                return done(null, false, {message: "User not found"});
            } else if(user.isCorrectPassword(password)) {
                return done(null, user);
            } else {
                return done(null, false, {message: "Incorrect password"});
            }
        });
    }));
};