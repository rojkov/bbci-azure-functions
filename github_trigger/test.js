var module = require("./index.js");
var context = {
    log: console.log,
    done: function() { console.log(this.bindings) },
    req: {
        headers: { "x-github-event": "push" }
    },
    bindings: { outputQueueItem: null },
    res: null
};

var data = {
    after: "9ba7e37f114864565279cbb395398f44557da103",
    repository: {
        name: "testrepo",
        owner: { name: "rojkov" }
    }
};

module(context, data);

