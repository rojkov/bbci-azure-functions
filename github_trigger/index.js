const uuidv4 = require("uuid/v4");
const moniker = require("moniker");
const azureStorage = require("azure-storage");
const GitHubApi = require("github");

function run(taskDef) {

    // create the iterator
    let task = taskDef();

    // start the task
    let result = task.next();

    // recursive function to iterate through
    (function step() {

        // if there's more to do
        if (!result.done) {

            // resolve to a promise to make it easy
            let promise = Promise.resolve(result.value);
            promise.then(function(value) {
                result = task.next(value);
                step();
            }).catch(function(error) {
                result = task.throw(error);
                step();
            });
        }
    }());
}

function getBlobToText(container, blobName) {
    return new Promise(function(resolve, reject) {
	let blobService = azureStorage.createBlobService(process.env["bbci_STORAGE"]);
	blobService.getBlobToText(container, blobName, function(err, text, result, response) {
	    if (err) {
		reject(err);
	    } else {
		resolve(text)
	    }
	});
    });
}

function updateGithubStatus(statustoken, statusdata) {
    return new Promise(function(resolve, reject) {
	let github = new GitHubApi({
	    protocol: "https",
	    host: "api.github.com"
	});

	github.authenticate({
	    type: "token",
	    token: statustoken
	});

	github.repos.createStatus(statusdata, function(err, result) {
	    if (err) {
		reject(err);
	    } else {
		resolve(result);
	    }
	});
    });
}

module.exports = function (context, data) {
    context.log('GitHub Webhook triggered!!');
    run(function*() {
	context.bindings.outputQueueItem = [];
	if (context.req.headers["x-github-event"] === "push") {
	    let message = {
		uuid: uuidv4(),
		humanid: moniker.choose(),
		githubdata: data
	    };
	    let githubtoken = yield getBlobToText("credentials", "github-status-token");
	    context.log(githubtoken, message);
	    context.bindings.outputQueueItem = [message];
	    yield updateGithubStatus(githubtoken.trim(), {
		owner: data.repository.owner.name,
		repo: data.repository.name,
		sha: data.after,
		state: "pending"
	    });
	    context.log("github status updated!!!");
	}
	context.res = { body: 'Ok' };
	context.done();
    });
};
