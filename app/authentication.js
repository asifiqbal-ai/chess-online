var User = require('./models/user');
var LocalStrategy = require('passport-local').Strategy;


module.exports = function(passport) {
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        User.findById(id, done);
    });

    passport.use(new LocalStrategy(function(id, password, done) {
        var search = new RegExp('^' + id + '$', 'i');
        User.findOne({$or: [{username: search},{email: search}]}, function(err, user) {
            if(err) {
                return done(null, false, {message: "Error occured while processing query"});
            } else if(!user) {
                return done(null, false, {message: "Incorrect username or email"});
            } else if(user.isCorrectPassword(password)) {
                return done(null, user);
            } else {
                return done(null, false, {message: "Incorrect password"});
            }
        });
    }));
};