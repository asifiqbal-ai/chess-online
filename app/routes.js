var express    = require('express');
var configMain = require('./routes/main');
var confgiApi  = require('./routes/api');


module.exports.api = function() {
    var router = express.Router();
    confgiApi(router);
    return router;
};


module.exports.main = function() {
    var router = express.Router();
    configMain(router);
    return router;
};