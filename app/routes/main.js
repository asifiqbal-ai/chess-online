var passport   = require('passport');
var User       = require('../models/user');


module.exports = function(router) {
    router.get('/', function(req, res) {
        if(req.isAuthenticated()) {
            res.redirect('/index');
        } else {
            res.render('public/home', {
                error: req.flash("error")
            });
        }
    });

    router.get('/index', function(req, res) {
        if(req.isAuthenticated()) {
            res.render('auth/index', {
                success: req.flash("success"),
                error: req.flash("error"),
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
            successFlash: 'Successfully logged in',
            failureRedirect: '/',
            failureFlash: true
        })
    );

    router.post('/signup', function(req, res) {
        // this is really lacking validation
        // [TODO] for next refactor!

        var first_name = "" || req.body.first_name;
        var last_name = "" || req.body.last_name;
        var username = new RegExp('.*' + ("" || req.body.username) + '.*', 'i')
        var email = new RegExp('.*' + ("" || req.body.email) + '.*', 'i');
        var password = "" || req.body.password;
        var password_confirm = "" || req.body.password_confirm;

        if(first_name && last_name && username && email && password && password_confirm) {
            if(password === password_confirm) {
                User.findOne({$or: [{username: username},{email: email}]}, function(err, user) {
                    if(err) {
                        req.flash("error", "Error occured while processing query!");
                        res.redirect('/');
                    } else if(!user) {
                        var newUser = new User({
                            first_name: first_name,
                            last_name: last_name,
                            username: req.body.username,
                            email: req.body.email,
                            password: password,
                            friends: []
                        });

                        newUser.save(function(err) {
                            if(err) {
                                req.flash("error", "Error occured while processing query!");
                                res.redirect('/');
                            } else {
                                req.logIn(newUser, function(err) {
                                    if(err) {
                                        req.flash("error", "Error logging in newly crated user. Try logging in manually.");
                                        res.redirect('/');
                                    } else {
                                        req.flash("success", "Successfully signed up!");
                                        res.redirect('/');
                                    }
                                });
                            }
                        });
                    } else {
                        req.flash("error", "Username or email already exists!");
                        res.redirect('/');
                    }
                });
            } else {
                req.flash("error", "Passwords did not match!");
                res.redirect('/');
            }
        } else {
            req.flash("error", "Missing parameters!");
            res.redirect('/');
        }
    });

    router.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    router.get('*', function(req, res) {
        /* 
         * This really shouldn't redirect in the case of authenticated users.
         * It should instead serve the angular.js bootstrap page - so that angular
         * may handle the route. Will fix later [TODO]
         */
        res.redirect('/');
    });
};