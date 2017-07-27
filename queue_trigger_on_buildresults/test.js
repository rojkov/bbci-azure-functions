var module = require("./index.js");
var context = {
    log: console.log,
    done: function() {}
};

var taskdata = {
    human_id: "many-wish",
    build_result: "success",
    ping: "ping"
};
module(context, taskdata);

taskdata.ping = "";
module(context, taskdata);
