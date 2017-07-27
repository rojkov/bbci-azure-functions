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

var data1 = {
    after: "5496a3e0a144c0fb2ce34dfb1255444178cd8df0",
    repository: {
        name: "meta-ros",
        owner: { name: "rojkov" }
    }
};

module(context, data1);

context.req.headers["x-github-event"] = "pull_request";
var data2 = {
    action: "opened",
    pull_request: {
	head: {
	    sha: "6b4a2306ec1dc6ea823d032eabb26b8fbf90956f",
	    repo: {
		clone_url: "https://github.com/bbcibot/meta-ros.git"
	    }
	}
    },
    repository: {
        name: "meta-ros",
        owner: { name: "rojkov" }
    }
};
module(context, data2);
