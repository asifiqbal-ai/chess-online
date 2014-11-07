var app = angular.module('chessOnline', ['ngRoute', 'friends', 'sockets']);


app.config(['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {
        $routeProvider.
            when('/settings', {
                templateUrl: 'views/settings',
                controller: 'AddFriendCtrl' ///////
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
                controller: 'AddFriendCtrl' ///////
            }).
            when('/home', {
                templateUrl: 'views/new_game',
                controller: 'AddFriendCtrl' ///////
            }).
            otherwise({
                redirectTo: '/home',
                controller: 'AddFriendCtrl' ///////
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



app.controller("NavSbFriendsCtrl", ['$scope', 'friends',
    function($scope, friends) {
        $scope.friends = friends;
    }
]);



app.controller("AddFriendCtrl", ['$scope', '$http', 'friends',
    function($scope, $http, friends) {
        $scope.keywords = "";
        $scope.searching = false;
        $scope.results = [];

        $scope.$watch(function() {
            return $scope.keywords;
        }, function(keywords) {
            if(!keywords) {
                $scope.results = [];
                $scope.searching = false;
                return;
            }
            $scope.searching = true;
            friends.search(keywords, function(data) {
                $scope.searching = false;
                $scope.results = data;
            });
        });
    }
]);



app.controller("ProfileCtrl", ['$scope', '$routeParams','friends', 'socket',
    function($scope, $routeParams, friends, socket) {
        $scope.username = $routeParams.username;
        $scope.friends = friends;
        $scope.make_request = friends.make_request;
        $scope.cancel_request = friends.unfriend;

        friends.update_user($scope.username); // ensure user is at least cached...
    }
]);