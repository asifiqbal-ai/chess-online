var passport   = require('passport');
var User       = require('../models/user');
var _          = require('underscore');
var sockets    = require('../sockets');

var EXPOSED_USER_FIELDS = 'first_name last_name username email rank online -_id';

module.exports = function(router) {
    router.use(function(req, res, next) {
        if(req.isAuthenticated()) {
            next();
        } else {
            res.status(401);
            res.send("Unauthorized");
        }
    });

    router.get('/friends/info/:username', function(req, res) {
        var search = new RegExp('^' + req.params.username + '$', 'i');
        User.findOne({$or: [{username: search},{email: search}]}, EXPOSED_USER_FIELDS, function(err, user) {
            if(err) {
                res.status(500); // internal server error
                res.send("Internal Server Error");
            } else if(!user) {
                res.status(404); // not found
                res.send("User not found");
            } else {
                res.json(user);
            }
        });
    });

    router.get('/friends/search/:keywords', function(req, res) {
        var exposed_fields = 'first_name last_name username email rank';
        var search = new RegExp('.*' + req.params.keywords + '.*', 'i');
        var search_term = {
            $or: [
                {first_name: search},
                {last_name: search},
                {username: search},
                {email: search}
            ]
        };

        User.find(search_term, function(err, users) {
            req.user.populate('friends recv_friend_requests sent_friend_requests', function() {
                var friends = _.pluck(req.user.friends, 'username');
                var req_sent = _.pluck(req.user.sent_friend_requests, 'username');
                var req_recv = _.pluck(req.user.recv_friend_requests, 'username');

                console.log(friends);
                users = _.map(users, function(user) {
                    console.log(user.username);
                    var is_friend = _.contains(friends, user.username);
                    var has_sent_request = _.contains(req_sent, user.username);
                    var has_recv_request = _.contains(req_recv, user.username);
                    var no_interaction = !(is_friend || has_sent_request || has_recv_request);
                    return {
                        first_name: user.first_name,
                        last_name: user.last_name,
                        username: user.username,
                        email: user.email,
                        rank: user.rank,
                        is_friend: is_friend,
                        has_sent_request: has_sent_request,
                        has_recv_request: has_recv_request,
                        no_interaction: no_interaction
                    };
                });

                console.log(users);

                res.json(_.filter(users, function(user) {
                   return user.username != req.user.username;
                }));
            });
        });
    });

    router.get('/friends', function(req, res) {
        req.user.populate('friends', EXPOSED_USER_FIELDS, function() {
            res.json(_.indexBy(req.user.friends, 'username'));
        });
    });

    router.get('/friends/requests', function(req, res) {
        req.user.populate('recv_friend_requests sent_friend_requests', EXPOSED_USER_FIELDS, function() {
            res.json({
                sent: _.indexBy(req.user.sent_friend_requests, 'username'),
                received: _.indexBy(req.user.recv_friend_requests, 'username')
            });
        });
    });


    router.post('/friends/remove', function(req, res) {
        var search = new RegExp('^' + req.body.username + '$', 'i');
        User.findOne({username: search}, function(err, user) {
            if(err) {
                res.status(500); // internal server error
                res.send("Internal Server Error");
            } else if(!user) {
                res.status(404); // not found
                res.send("User not found");
            } else if(user.username === req.user.username) {
                res.status(409);
                res.send("You cannot add yourself");
            } else {
                var toPopulate = 'friends sent_friend_requests recv_friend_requests';
                req.user.populate(toPopulate, function() {
                    user.populate(toPopulate, function() {
                        var friends = _.pluck(req.user.friends, 'username');

                        if(_.contains(friends, user.username)) {
                            res.status(200);
                            req.user.friends = _.filter(req.user.friends, function(u) {
                                return u.username !== user.username;
                            });
                            user.friends = _.filter(user.friends, function(u) {
                                return u.username !== req.user.username;
                            });
                            req.user.save(function() {
                                user.save(function() {
                                    res.status(200);
                                    res.send("Success");
                                    sockets.sio().to(req.user.id).emit('friend update total');
                                    sockets.sio().to(user.id).emit('friend update total');
                                });
                            });
                        } else {
                            res.status(404);
                            res.send("Not currently friends");
                        }
                    });
                });
            }
        });
    });


    router.post('/friends/requests/make', function(req, res) {
        // Making and accepting friend requests
        var search = new RegExp('^' + req.body.username + '$', 'i');
        User.findOne({username: search}, function(err, user) {
            if(err) {
                res.status(500); // internal server error
                res.send("Internal Server Error");
            } else if(!user) {
                res.status(404); // not found
                res.send("User not found");
            } else if(user.username === req.user.username) {
                res.status(409);
                res.send("You cannot add yourself");
            } else {
                var toPopulate = 'friends sent_friend_requests recv_friend_requests';
                req.user.populate(toPopulate, function() {
                    user.populate(toPopulate, function() {
                        var friends = _.pluck(req.user.friends, 'username');
                        var req_sent = _.pluck(req.user.sent_friend_requests, 'username');
                        var req_recv = _.pluck(req.user.recv_friend_requests, 'username');
                        var user_sent = _.pluck(user.sent_friend_requests, 'username');
                        var user_recv = _.pluck(user.recv_friend_requests, 'username');

                        var update = function() {
                            req.user.save(function() {
                                user.save(function() {
                                    res.status(200);
                                    res.send("Success");
                                    sockets.sio().to(req.user.id).emit('friend update total');
                                    sockets.sio().to(user.id).emit('friend update total');
                                });
                            });
                        };

                        if(_.contains(friends, user.username)) {
                            res.status(409); // conflict: already exists
                            res.send("Already friends");
                        } else if(_.contains(req_sent, user.username)) {
                            res.status(409); // conflict: already exists
                            res.send("Already sent request");
                        } else if(_.contains(req_recv, user.username)) {
                            req.user.recv_friend_requests = _.filter(req.user.recv_friend_requests, function(u) {
                                return u.username !== user.username;
                            });
                            user.sent_friend_requests = _.filter(user.sent_friend_requests, function(u) {
                                return u.username !== req.user.username;
                            });
                            req.user.friends.push(user);
                            user.friends.push(req.user);
                            update();
                        } else {
                            req.user.sent_friend_requests.push(user);
                            user.recv_friend_requests.push(req.user);
                            update();
                        }
                    });
                });
            }
        });
    });
};