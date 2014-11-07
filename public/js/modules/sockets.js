var app = angular.module('sockets', []);


app.factory('socket', ['$rootScope', function($rootScope) {
    var instance = {};

    instance.connected = false;
    instance.status = 'initialized';
    instance.socket = io();

    instance.on = function(event, callback) {
        instance.socket.on(event, function() {
            var callback_args = arguments;
            $rootScope.$apply(function() {
                callback.apply(this, callback_args);
            });
        });
    };

    instance.emit = function(event, data) {
        instance.socket.emit(event, data);
    };

    var update = function(connected, status) {
        return function() {
            instance.connected = connected;
            instance.status = status;
        };
    };

    instance.on('connect', update(true, 'connected'));
    instance.on('reconnect', update(true, 'connected'));
    instance.on('connecting', update(false, 'connecting'));
    instance.on('connect_failed', update(false, 'failed to connect'));
    instance.on('disconnect', update(false, 'disconnected'));
    instance.on('reconnect_fail', update(false, 'disconnected'));
    instance.on('reconnecting', update(false, 'reconnecting'));

    return instance;
}]);
