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
        var instance = {};

        instance.status = [];
        
        instance.pending_requests = {
            received: [],
            sent: []
        };

        instance.update = function() {
            $http.get('/api/friends/status').success(function(data) {
                instance.status = data;
            });
        };

        return instance;
    }
]);

app.controller("PostsCtrl", function($scope, friends) {
  $scope.status = friends.status;

  $scope.click = function() {
    friends.update();
  };

  $scope.$watch(function() {
    return friends.status;
  }, function(newVal) {
    $scope.status = newVal;
  });
});