var app = angular.module('chessOnline', ['ngRoute']);



app.config(['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {
        $routeProvider.
            when('/settings', {
                templateUrl: 'views/settings',
                controller: 'AddFriendCtrl'
            }).
            when('/user/:username', {
                templateUrl: 'views/user_profile',
                controller: 'ProfileCtrl'
            }).
            when('/friends/add', {
                templateUrl: 'views/add_friends',
                controller: 'AddFriendCtrl'
            }).
            when('/games/new', {
                templateUrl: 'views/new_game',
                controller: 'AddFriendCtrl'
            }).
            when('/home', {
                templateUrl: 'views/new_game',
                controller: 'AddFriendCtrl'
            }).
            otherwise({
                redirectTo: '/home',
                controller: 'AddFriendCtrl'
            });
        $locationProvider.html5Mode(true);
    }
]);



app.filter('orderObjectBy', function() {
  return function(items, field) {
    var filtered = [];
    angular.forEach(items, function(item) {
      filtered.push(item);
    });
    filtered.sort(function (a, b) {
      return (a[field] > b[field] ? 1 : -1);
    });
    return filtered;
  };
});



app.factory('socket', ['$rootScope', function($rootScope) {
    // this really should be implemented as a provider
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


    // Hook onto connection oriented events to maintain status flag
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



app.factory('friends', ['$http', '$rootScope','socket',
    function($http, $rootScope, socket) {
        var instance = {};

        instance.friends = {};
        instance.pending = {received: {}, sent: {}};
        instance.cache = {};
        
        instance.update = function() {
            $http.get('/api/friends').success(function(data) {
                instance.friends = data;
                instance.cache = _.extend(instance.cache, data);
            });
            $http.get('/api/friends/requests').success(function(data) {
                instance.pending = data;
                instance.cache = _.extend(instance.cache, data.received, data.sent);
            });
        };

        instance.search = function(keywords) {
            return $http.get('/api/friends/search/' + keywords);
        };

        instance.make_request = function(username, callback) {
            $http.post('/api/friends/requests/make', {username: username}).success(function() {
                instance.update();
                if(callback) callback();
            });
        };

        instance.unfriend = function(username, callback) {
            $http.post('/api/friends/remove', {username: username}).success(function() {
                instance.update();
                if(callback) callback();
            });
        };

        instance.get_user_info = function(username, callback) {
            if(username in instance.cache) {
                callback(instance.cache[username]);
            } else {
                $http.get('/api/friends/info/' + username).success(callback);
            }
        };

        instance.update_user = function(username) {
            $http.get('/api/friends/info/' + username).success(function(data) {
                instance.cache[username] = data;
            });
        };

        socket.on('friend update total', instance.update);

        socket.on('friend update partial', function(data) {
            instance.friends[data.username] = data;
        });

        instance.update();
        return instance;
    }
]);



app.controller("NavSbFriendsCtrl", ['$scope', 'friends',
    function($scope, friends) {
        $scope.friends = friends;
    }
]);



app.controller("AddFriendCtrl", ['$scope', '$http', 'friends',
    function($scope, $http, friends) {
        $scope.keywords = "";
        $scope.results = [];

        $scope.make_request = function(friend) {
            friends.make_request(friend.username, function() {
                friends.search($scope.keywords).success(function(data) {
                    $scope.results = data;
                });
            });
        };

        $scope.$watch(function() {
            return friends.friends;
        }, function(newVal) {
            if(!$scope.keywords) {
                $scope.results = [];
                return;
            }
            friends.search($scope.keywords).success(function(data) {
                $scope.results = data;
            });
        });

        $scope.$watch(function() {
            return $scope.keywords;
        }, function(keywords) {
            if(!keywords) {
                $scope.results = [];
                return;
            }
            friends.search(keywords).success(function(data) {
                $scope.results = data;
            });
        });
    }
]);



app.controller("ProfileCtrl", ['$scope', '$routeParams','friends', 'socket',
    function($scope, $routeParams, friends, socket) {
        $scope.username = $routeParams.username;
        $scope.friends = friends;

        $scope.unfriend = function() {
            friends.unfriend($routeParams.username, function() {
                friends.update_user($scope.username);
            });
        };

        $scope.friend_request = function() {
            friends.make_request($scope.username, function() {
                friends.update_user($scope.username);
            });
        };

        socket.on('friend update total', function() {
            friends.update_user($scope.username);
        });

        friends.update_user($scope.username);
    }
]);