var module = require("./index.js");
var context = {
    log: console.log,
    done: function() {}
};

var taskdata = {
    humanid: "vm-tutorial2"
};
module(context, taskdata);
