var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');
var _        = require('underscore');


// schema ==========================================================================
var UserSchema = new mongoose.Schema({
    first_name           : {type: String, required: true},
    last_name            : {type: String, required: true},
    username             : {type: String, required: true, unique: true},
    email                : {type: String, required: true, unique: true},
    password             : {type: String, required: true},
    rank                 : {type: Number, required: true, default: 1200},
    online               : {type: Boolean, required: true, default: false},
    sent_friend_requests : [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    recv_friend_requests : [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    friends              : [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}]
});


// instance methods ================================================================
UserSchema.methods.isCorrectPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};


UserSchema.methods.toSafeObject = function() {
    return {
        first_name: this.first_name,
        last_name: this.last_name,
        username: this.username,
        email: this.email,
        online: this.online,
        rank: this.rank
    };
};


UserSchema.methods.friendStatus = function(user) {
    var get = function(field, user) {
        var populated = user.populated(field);
        return _.map(user[field], function(f) {
            return populated ? f.id : f.toString();
        });
    };

    var friends = get('friends', this);
    var sent = get('sent_friend_requests', this);
    var recv = get('recv_friend_requests', this);

    if(_.contains(friends, user.id)) {
        return 'friends';
    } else if(_.contains(sent, user.id)) {
        return 'sent';
    } else if(_.contains(recv, user.id)) {
        return 'received';
    }
    return 'none';
};


UserSchema.methods.areFriends = function(user) {
    return this.friendStatus(user) === 'friends';
}


UserSchema.methods.hasSentFriendRequest = function(user) {
    return this.friendStatus(user) === 'sent';
}


UserSchema.methods.hasRecvFriendRequest = function(user) {
    return this.friendStatus(user) === 'received';
}


UserSchema.methods.addFriend = function(user, callback) {
    /* 
     * Advances the state of friendship between two users. Currently, the
     * cycle is: not friends -> request -> accept -> friends.
     * 
     * The user through which this function is initiated is considered
     * as the sender of the request. May also be used to accept requests.
     * 
     * The callback is called with two arguments: the status of the friendship
     * before and after executing the function.
     */
    var thisUser      = this; // closure for callbacks...
    var currentStatus = thisUser.friendStatus(user);
    var modified      = false;

    if(currentStatus === 'none') {
        thisUser.sent_friend_requests.push(user)
        user.recv_friend_requests.push(thisUser)
        modified = true;
    } else if(currentStatus === 'received') {
        var remove = function(field, user, toRemove) {
            var populated = user.populated(field);
            user[field] = _.filter(user[field], function(u) {
                var id = populated ? u.id : u.toString();
                return id !== toRemove.id;
            });
        };

        remove('recv_friend_requests', thisUser, user);
        remove('sent_friend_requests', user, thisUser);
        thisUser.friends.push(user);
        user.friends.push(thisUser);
        modified = true;
    }

    if(modified) {
        /* 
         * Both of the following requests *must* either succeed or fail
         * together - for now I will ignore this constraint. 
         *
         * I don't think mongoose/mongo offers a transaction service...
         */
        thisUser.save(function(err) {
            user.save(function(err) {
                callback(currentStatus, thisUser.friendStatus(user));
            });
        });
    } else {
        callback(currentStatus, currentStatus);
    } 
};


UserSchema.methods.removeFriend = function(user, callback) {
    /* 
     * The callback is called with two arguments upon completion: the
     * friendship status before and after the function.
     */
    var thisUser      = this; // closure for callbacks...
    var currentStatus = thisUser.friendStatus(user);

    if(currentStatus !== 'none') {
        var remove = function(field, user, toRemove) {
            var populated = user.populated(field);
            user[field] = _.filter(user[field], function(u) {
                var id = populated ? u.id : u.toString();
                return id !== toRemove.id;
            });
        };

        // Brute force removal of all ties between the two users...
        remove('recv_friend_requests', thisUser, user);
        remove('sent_friend_requests', thisUser, user);
        remove('friends', thisUser, user);

        remove('recv_friend_requests', user, thisUser);
        remove('sent_friend_requests', user, thisUser);
        remove('friends', user, thisUser);

        thisUser.save(function(err) {
            user.save(function(err) {
                callback(currentStatus, thisUser.friendStatus(user));
            });
        });
    } else {
        callback(currentStatus, currentStatus); // Already null friend status
    }
};


// static methods ==================================================================
UserSchema.statics.search = function(keyword, callback) {
    var search = new RegExp('.*' + keyword + '.*', 'i');
    var search_term = {
        $or: [
            {first_name: search},
            {last_name: search},
            {username: search},
            {email: search}
        ]
    };
    return this.find(search_term, callback);
}


UserSchema.statics.findOneExact = function(id, callback) {
    /*
     * id: string -> will be applied for both email or username
     *     object[email] -> will be applied to email
     *     object[username] -> will be applied to username
     */
    var u, e;

    if(typeof id == 'string') {
        u = new RegExp('^' + id + '$', 'i');
        e = u;
    } else if(typeof id == 'object') {
        u = new RegExp('^' + id.username + '$', 'i');
        e = new RegExp('^' + id.email + '$', 'i');
    } else {
        return callback(new Error("Invalid id"));
    }

    return this.findOne({$or: [{username: u},{email: e}]}, callback);
}


// password management ============================================================
var isValidPassword = function(password) {
    // Very lax conditions for now, I will develop a 
    // more elaborate password validation scheme later
    return password.length > 5;
};


UserSchema.pre('save', function(next) {
    if(!this.isNew) {
        next();
    } else if(isValidPassword(this.password)) {
        this.password = bcrypt.hashSync(this.password, bcrypt.genSaltSync());
        next();
    } else {
        next(new Error("invalid password"));
    }
});


// validation ======================================================================
var v = function(path, fn, message) {
    UserSchema.path(path).validate(fn, message);
};

var vName = function(name) {
    return name.length >= 3 && /^[a-z ]+$/i.test(name);
};

var vUsername = function(username) {
    return username.length >= 4 && /^\w+$/.test(username);
};

var vEmail = function(email) {
    return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);
};

var vPassword = function(password) {
    return password.length >= 8;
};


v('first_name', vName, 
    'Invalid first name: Must only contain characters, and length must be at least 3.');
v('last_name', vName, 
    'Invalid last name: Must only contain characters, and length must be at least 3.');
v('username', vUsername, 
    'Invalid username: Must only contain letters and numbers, and length must be at least 4.');
v('email', vEmail, 
    'Invalid email.');
v('password', vPassword, 
    'Invalid password: length must be at least 8.');


// exports =========================================================================
module.exports = mongoose.model('User', UserSchema);