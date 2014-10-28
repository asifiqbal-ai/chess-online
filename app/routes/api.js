var passport   = require('passport');
var User       = require('../models/user');


module.exports = function(router) {
    router.get('/friends/status', function(req, res) {
        req.user.populate('friends', 'first_name last_name username email online -_id', function() {
            res.json(req.user.friends);
        });
    });
};