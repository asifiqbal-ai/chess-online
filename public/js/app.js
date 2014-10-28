var app = angular.module('chessOnline', ['ngRoute']);

app.config(['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {
        $routeProvider.
            when('/settings', {
                templateUrl: 'views/settings',
                controller: ''
            }).
            when('/user/:s', {
                templateUrl: 'views/user_profile',
                controller: ''
            }).
            when('/friends/add', {
                templateUrl: 'views/add_friends',
                controller: ''
            }).
            when('/games/new', {
                templateUrl: 'views/new_game',
                controller: ''
            }).
            when('/home', {
                templateUrl: 'views/new_game',
                controller: ''
            }).
            otherwise({
                redirectTo: '/home',
                controller: ''
            });
        $locationProvider.html5Mode(true);
    }
]);


app.factory('friends', ['$http',
    function($http) {
        var instance = {
            status: [],
            pending_requests: {received: [], sent: []}
        };
        
        instance.update = function() {
            $http.get('/api/friends/status').success(function(data) {
                instance.status = data;
            });
            $http.get('/api/friends/requests').success(function(data) {
                instance.pending_requests = data;
            });
        };

        instance.update();
        return instance;
    }
]);


app.controller("PostsCtrl", function($scope, friends) {
  $scope.status = friends.status;
  $scope.pending_requests = friends.pending_requests;

  $scope.click = function() {
    friends.update();
  };

  $scope.$watch(function() {
    return friends.status;
  }, function(newVal) {
    $scope.status = newVal;
  });

  $scope.$watch(function() {
    return friends.pending_requests;
  }, function(newVal) {
    $scope.pending_requests = newVal;
  });
});