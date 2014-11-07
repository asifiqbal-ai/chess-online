var _ = require('underscore');
var sio;


var extendFriend = function(user, friend) {
    return _.extend(friend.toSafeObject(), {friend_status: user.friendStatus(friend)});
}


var broadcast_to_populations = function(user, population, event) {
    user.populate(population, function() {
        _.each(population.split(' '), function(field) {
            _.each(user[field], function(friend) {
                sio.to(friend.id).emit(event, extendFriend(friend, user));
            });
        });
    });
};


module.exports.initialize = function(_sio) {
    sio = _sio;
};


module.exports.sio = function() {
    return sio;
};


module.exports.userConnected = function(sio, socket, user) {
    // Called once, for a users first sockets
    // onConnection will also be called for this socket, and all
    // subsequent sockets from this user. 
    // Use this function to track user sign ons
    var toNotify = 'friends sent_friend_requests recv_friend_requests';
    broadcast_to_populations(user, toNotify, 'friend update partial');
};


module.exports.userDisconnected = function(sio, socket, user) {
    // Called when a user has no more active sockets 
    // Use this function to track user sign offs
    var toNotify = 'friends sent_friend_requests recv_friend_requests';
    broadcast_to_populations(user, toNotify, 'friend update partial');
};


module.exports.onConnection = function(sio, socket, user) {
    // Called for every socket connection
    socket.join(user.id); // Each user has their own room
};