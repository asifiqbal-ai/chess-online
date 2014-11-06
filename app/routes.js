var express    = require('express');
var configMain = require('./routes/main');
var confgiApi  = require('./routes/api');


var api = function() {
    var router = express.Router();
    confgiApi(router);
    return router;
};


var main = function() {
    var router = express.Router();
    configMain(router);
    return router;
};


module.exports.configure = function(app) {
    app.use('/api', api());
    app.use('/', main());
}
