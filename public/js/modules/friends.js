var app = angular.module('friends', []);


app.factory('friends', ['$http', '$rootScope','socket',
  function($http, $rootScope, socket) {
    var instance = {};

    instance.friends = {};
    instance.pending = {received: {}, sent: {}};
    instance.cache = {};
    
    instance.update = function() {
      var dirty = {};
      var clean = function(list) {
        _.each(list, function(username) {
          dirty[username] = false;
        });
      };

      _.each(_.keys(instance.cache), function(k) {
        dirty[k] = true;
      });

      $http.get('/api/friends').success(function(data) {
        instance.friends = data;
        instance.cache = _.extend(instance.cache, data);
        clean(_.keys(data));

        $http.get('/api/friends/requests').success(function(data) {
          instance.pending = data;
          instance.cache = _.extend(instance.cache, data.received, data.sent);
          clean(_.keys(data.received));
          clean(_.keys(data.sent));

          _.each(_.keys(dirty), function(username) {
            if(dirty[username]) {
              // this really should be a single request...
              // will implement as such later if required [TODO]
              $http.get('/api/friends/info/' + username).success(function(user) {
                instance.cache[username] = user;
              });
            }
          });
        });
      });
    };

    instance.search = function(keywords, callback) {
      return $http.get('/api/friends/search/' + keywords).success(function(data) {
        _.each(data, function(user) {
          instance.update(user.username, user);
        });
        callback(data);
      });
    };

    instance.make_request = function(username, callback) {
      $http.post('/api/friends/requests/make', {username: username}).success(function() {
        if(callback) callback();
      });
    };

    instance.unfriend = function(username, callback) {
      $http.post('/api/friends/remove', {username: username}).success(function() {
        if(callback) callback();
      });
    };

    instance.get_user_info = function(username, callback) {
      if(username in instance.cache) {
        callback(instance.cache[username]);
      } else {
        $http.get('/api/friends/info/' + username).success(function(user) {
          instance.update_user(username, user);
          callback(user);
        });
      }
    };

    instance.update_user = function(username, user) {
      var update = function(user) {
        delete instance.friends[username];
        delete instance.pending.received[username];
        delete instance.pending.sent[username];

        if(user.friend_status === 'friends') {
          instance.friends[username] = user;
        } else if(user.friend_status === 'sent') {
          instance.pending.received[username] = user;
        } else if(user.friend_status === 'received') {
          instance.pending.sent[username] = user;
        }

        instance.cache[username] = user;
      };

      if(user) {
        update(user);
      } else {
        $http.get('/api/friends/info/' + username).success(update);
      }      
    };

    socket.on('friend update total', instance.update);

    socket.on('friend update partial', function(user) {
      instance.update_user(user.username, user);
    });

    instance.update();
    
    return instance;
  }
]);



app.directive('friendListItem', function() {
  var directive = {
    restrict: 'EA',
    templateUrl: 'views/directives/friendListItem',
    scope: { username: '=username' }
  };

  directive.controller = ['$scope', 'friends', function($scope, friends) {
    $scope.make_request = friends.make_request;
    $scope.cancel_request = friends.unfriend;

    $scope.$watchCollection(function() {
      return friends.cache;
    }, function() {
      friends.get_user_info($scope.username, function(user) {
        $scope.user = user;
      });
    });
  }];

  return directive;
});