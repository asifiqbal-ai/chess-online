var passport = require('passport');
var _        = require('underscore');
var User     = require('../models/user');


module.exports = function(router) {
    router.get('/', function(req, res) {
        if(req.isAuthenticated()) {
            res.redirect('/index');
        } else {
            var users = req.flash('user');
            res.render('public/home', {
                errors: req.flash('error'),
                user: (users.length > 0 ? users[0] : {})
            });
        }
    });

    router.get('/index', function(req, res) {
        if(req.isAuthenticated()) {
            res.render('auth/index', {
                errors: req.flash('error'),
                user: req.user
            });
        } else {
            res.redirect('/');
        }
    });

    router.get('/views/:view_name', function(req, res) {
        res.render('auth/views/' + req.params.view_name);
    });

    router.post('/login',
        passport.authenticate('local', {
            successRedirect: '/',
            failureRedirect: '/',
            failureFlash: true
        })
    );

    router.post('/signup', function(req, res) {
        var newUser = new User({
            first_name: ('' || req.body.first_name),
            last_name: ('' || req.body.last_name),
            username: ('' || req.body.username),
            email: ('' || req.body.email),
            password: ('' || req.body.password),
            friends: []
        });

        if(newUser.password === req.body.password_confirm) {
            User.findOneExact({username: newUser.username, email: newUser.email}, function(err, user) {
                if(err) {
                    req.flash('user', newUser);
                    req.flash('error', 'Error occured while processing query.');
                    res.redirect('/');
                } else if(!user) {
                    newUser.save(function(err) {
                        if(err) {
                            // probably validation errors - flash them and redirect
                            req.flash('user', newUser);
                            _.map(err.errors, function(error, field) {
                                req.flash('error', error.message);
                            });
                            res.redirect('/');
                        } else {
                            req.logIn(newUser, function(err) {
                                res.redirect('/');
                            });
                        }
                    });
                } else {
                    req.flash('user', newUser);
                    req.flash('error', 'Username or email already exists.');
                    res.redirect('/');
                }
            });
        } else {
            req.flash('user', newUser);
            req.flash('error', 'Passwords did not match.');
            res.redirect('/');
        }
    });

    router.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    router.get('*', function(req, res) {
        if(req.isAuthenticated()) {
            //serve the angular.js index page - so that angular may handle the route
            res.render('auth/index', {
                errors: req.flash('error'),
                user: req.user
            });
        } else {
            res.redirect('/');
        }
    });
};