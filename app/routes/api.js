var passport   = require('passport');
var User       = require('../models/user');
var _          = require('underscore');
var sockets    = require('../sockets');

var EXPOSED_USER_FIELDS = 'first_name last_name username email rank online';

var addFriendStatus = function(user, targetList) {
    // this shouldn't be here. I'm going to refactor the UI so that it's not needed
    return _.map(targetList, function(u) {
        return {
            first_name: u.first_name,
            last_name: u.last_name,
            username: u.username,
            email: u.email,
            rank: u.rank,
            online: u.online,
            is_friend: user.areFriends(u),
            has_sent_request: user.hasSentFriendRequest(u),
            has_recv_request: user.hasRecvFriendRequest(u),
            no_interaction: !(user.areFriends(u) || user.hasSentFriendRequest(u) || user.hasRecvFriendRequest(u))
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
        User.findOne({$or: [{username: search},{email: search}]}, function(err, user) {
            if(err) {
                res.status(500); // internal server error
                res.send("Internal Server Error");
            } else if(!user) {
                res.status(404); // not found
                res.send("User not found");
            } else {
                var is_friend = req.user.areFriends(user);
                var has_sent = req.user.hasSentFriendRequest(user);
                var has_recv = req.user.hasRecvFriendRequest(user);
                var no_interaction = !(is_friend || has_sent || has_recv);

                res.json(_.extend(user.toSafeObject(), {
                    is_friend: is_friend,
                    has_sent_request: has_sent,
                    has_recv_request: has_recv,
                    no_interaction: no_interaction
                }));
            }
        });
    });

    router.get('/friends/search/:keywords', function(req, res) {
        User.search(req.params.keywords, function(err, users) {
            res.json(_.compact(_.map(users, function(user) {
                var is_friend = req.user.areFriends(user);
                var has_sent = req.user.hasSentFriendRequest(user);
                var has_recv = req.user.hasRecvFriendRequest(user);
                var no_interaction = !(is_friend || has_sent || has_recv);

                if(user.id === req.user.id) 
                    return null; // this result will be excluded by _.compact

                return _.extend(user.toSafeObject(), {
                    is_friend: is_friend,
                    has_sent_request: has_sent,
                    has_recv_request: has_recv,
                    no_interaction: no_interaction
                });
            })));
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
                req.user.removeFriend(user, function(before, after) {
                    if(before === 'none') {
                        res.status(404);
                        res.send("No interaction found");
                    } else {
                        res.status(200);
                        res.send("Success");
                        sockets.sio().to(req.user.id).emit('friend update total');
                        sockets.sio().to(user.id).emit('friend update total');
                    }
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
                req.user.addFriend(user, function(before, after) {
                    if(before === 'sent' || before === 'friends') {
                        res.status(409);
                        res.send("Conflicting request");
                    } else {
                        res.status(200);
                        res.send("Success");
                        sockets.sio().to(req.user.id).emit('friend update total');
                        sockets.sio().to(user.id).emit('friend update total');
                    }
                });
            }
        });
    });
};