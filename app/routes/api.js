var passport   = require('passport');
var User       = require('../models/user');
var _          = require('underscore');
var sockets    = require('../sockets');

var EXPOSED_USER_FIELDS = 'first_name last_name username email rank online -_id';

var addFriendStatus = function(user, targetList) {
    var friends = _.pluck(user.friends, 'username');
    var req_sent = _.pluck(user.sent_friend_requests, 'username');
    var req_recv = _.pluck(user.recv_friend_requests, 'username');
    return _.map(targetList, function(u) {
        var is_friend = _.contains(friends, u.username);
        var has_sent_request = _.contains(req_sent, u.username);
        var has_recv_request = _.contains(req_recv, u.username);
        var no_interaction = !(is_friend || has_sent_request || has_recv_request);
        return {
            first_name: u.first_name,
            last_name: u.last_name,
            username: u.username,
            email: u.email,
            rank: u.rank,
            online: u.online,
            is_friend: is_friend,
            has_sent_request: has_sent_request,
            has_recv_request: has_recv_request,
            no_interaction: no_interaction
        };
    });
};

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
                req.user.populate('friends recv_friend_requests sent_friend_requests', function() {
                    res.json(addFriendStatus(req.user, [user])[0]);
                });
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
                res.json(_.filter(addFriendStatus(req.user, users), function(user) {
                   return user.username != req.user.username;
                }));
            });
        });
    });

    router.get('/friends', function(req, res) {
        req.user.populate('friends recv_friend_requests sent_friend_requests', EXPOSED_USER_FIELDS, function() {
            res.json(_.indexBy(addFriendStatus(req.user, req.user.friends), 'username'));
        });
    });

    router.get('/friends/requests', function(req, res) {
        req.user.populate('friends recv_friend_requests sent_friend_requests', EXPOSED_USER_FIELDS, function() {
            res.json({
                sent: _.indexBy(addFriendStatus(req.user, req.user.sent_friend_requests), 'username'),
                received: _.indexBy(addFriendStatus(req.user, req.user.recv_friend_requests), 'username')
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
                res.send("You cannot remove yourself");
            } else {
                var filter = function(userList, user) {
                    return _.filter(userList, function(u) {
                        return u.username !== user.username;
                    });
                };

                var toPopulate = 'friends sent_friend_requests recv_friend_requests';

                req.user.populate(toPopulate, function() {
                    user.populate(toPopulate, function() {
                        var friends = _.pluck(req.user.friends, 'username');
                        var req_sent = _.pluck(req.user.sent_friend_requests, 'username');
                        var req_recv = _.pluck(req.user.recv_friend_requests, 'username');
                        var updated = false;

                        if(_.contains(friends, user.username)) {
                            req.user.friends = filter(req.user.friends, user);
                            user.friends = filter(user.friends, req.user);
                            updated = true;
                        } else if(_.contains(req_sent, user.username)) {
                            req.user.sent_friend_requests = filter(req.user.sent_friend_requests, user);
                            user.recv_friend_requests = filter(user.recv_friend_requests, req.user);
                            updated = true;
                        } else if(_.contains(req_recv, user.username)) {
                            req.user.recv_friend_requests = filter(req.user.recv_friend_requests, user);
                            user.sent_friend_requests = filter(user.sent_friend_requests, req.user);
                            updated = true;
                        }

                        if(updated) {
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
                            res.send("No interaction found");
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