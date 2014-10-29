var _ = require('underscore');
var sio;


var extractSafeFields = function(user) {
    return {
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        email: user.email,
        online: user.online,
        rank: user.rank
    };
};


var broadcast_to_population = function(user, population, event, data) {
    user.populate(population, function() {
        _.each(population.split(' '), function(field) {
            _.each(user[field], function(friend) {
                sio.to(friend.id).emit(event, data);
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
    broadcast_to_population(user, toNotify, 'friend update partial', extractSafeFields(user));
};


module.exports.userDisconnected = function(sio, socket, user) {
    // Called when a user has no more active sockets 
    // Use this function to track user sign offs
    var toNotify = 'friends sent_friend_requests recv_friend_requests';
    broadcast_to_population(user, toNotify, 'friend update partial', extractSafeFields(user));
};


module.exports.onConnection = function(sio, socket, user) {
    // Called for every socket connection
    // Use this function for main logic

    socket.join(user.id);

    socket.emit('hello', user.id);
    sio.to(user.id).emit('via_room', user.id);
};