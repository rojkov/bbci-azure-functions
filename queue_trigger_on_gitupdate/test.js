var module = require("./index.js");
var context = {
    log: console.log,
    done: function() {}
};

var taskdata = {
    human_id: "vm-tutorial2",
    ping: ""
};
module(context, taskdata);
