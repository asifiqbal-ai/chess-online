var passport   = require('passport');
var User       = require('../models/user');

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

    router.get('/friends/status', function(req, res) {
        req.user.populate('friends', EXPOSED_USER_FIELDS, function() {
            res.json(req.user.friends);
        });
    });

    router.get('/friends/requests', function(req, res) {
        req.user.populate('recv_friend_requests sent_friend_requests', EXPOSED_USER_FIELDS, function() {
            res.json({
                sent: req.user.sent_friend_requests,
                received: req.user.recv_friend_requests
            });
        });
    });

    router.post('/friends/requests/make', function(req, res) {
        // Making and accepting friend requests
        res.send("Not yet implemented");
    });
};