var passport   = require('passport');
var User       = require('../models/user');
var _          = require('underscore');
var sockets    = require('../sockets');


var extendFriend = function(user, friend) {
    // I considered implementing this in the model - but the semantics are 
    // really quite specific to this module.
    return _.extend(friend.toSafeObject(), {friend_status: user.friendStatus(friend)});
}


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
                res.json(extendFriend(req.user, user));
            }
        });
    });

    router.get('/friends/search/:keywords', function(req, res) {
        User.search(req.params.keywords, function(err, users) {
            res.json(_.compact(_.map(users, function(user) {
                if(user.id === req.user.id) 
                    return null; // this result will be excluded by _.compact
                return extendFriend(req.user, user);
            })));
        });
    });

    router.get('/friends', function(req, res) {
        req.user.populate('friends recv_friend_requests sent_friend_requests', function() {
            res.json(_.indexBy(_.map(req.user.friends, function(friend) {
                return extendFriend(req.user, friend);
            }), 'username'));
        });
    });

    router.get('/friends/requests', function(req, res) {
        req.user.populate('friends recv_friend_requests sent_friend_requests', function() {
            res.json({
                sent: _.indexBy(_.map(req.user.sent_friend_requests, function(friend) {
                    return extendFriend(req.user, friend);
                }), 'username'),
                received: _.indexBy(_.map(req.user.recv_friend_requests, function(friend) {
                    return extendFriend(req.user, friend);
                }), 'username')
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
                        sockets.sio().to(req.user.id).emit('friend update partial', extendFriend(req.user, user));
                        sockets.sio().to(user.id).emit('friend update partial', extendFriend(user, req.user));
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
                        sockets.sio().to(req.user.id).emit('friend update partial', extendFriend(req.user, user));
                        sockets.sio().to(user.id).emit('friend update partial', extendFriend(user, req.user));
                    }
                });
            }
        });
    });
};