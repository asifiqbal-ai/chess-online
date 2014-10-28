var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var isValidPassword = function(password) {
    // Very lax conditions for now, I will develop a 
    // more elaborate password validation scheme later
    return password.length > 5;
};

var UserSchema = new mongoose.Schema({
    first_name           : {type: String, required: true},
    last_name            : {type: String, required: true},
    username             : {type: String, required: true, unique: true},
    email                : {type: String, required: true, unique: true},
    password             : {type: String, required: true},
    online               : {type: Boolean, required: true, default: false},
    sent_friend_requests : [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    recv_friend_requests : [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    friends              : [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}]
});

UserSchema.methods.isCorrectPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
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

module.exports = mongoose.model('User', UserSchema);