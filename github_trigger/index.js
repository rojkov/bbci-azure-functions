require("./deps.bundle.min");

const uuidv4 = global.deps.uuidv4;
const moniker = global.deps.moniker;
const azureStorage = global.deps.azureStorage;
const GitHubApi = global.deps.GitHubApi;

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

function getBlobToObj(container, blobName) {
    return new Promise(function(resolve, reject) {
	let blobService = azureStorage.createBlobService(process.env["bbci_STORAGE"]);
	blobService.getBlobToText(container, blobName, function(err, text, result, response) {
	    if (err) {
		reject(err);
	    } else {
		resolve(JSON.parse(text))
	    }
	});
    });
}

function updateGithubStatus(statustoken, statusdata, context) {
    context.log("inside github update");
    return new Promise(function(resolve, reject) {
	try {
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
	} catch (ex) {
	    context.log(ex);
	    reject(ex);
	}
    });
}

module.exports = function (context, data) {
    context.log('GitHub Webhook triggered!!');
    run(function*() {
	var gdata;
	var github_opts;

	context.bindings.outputQueueItem = [];

	const event_type = context.req.headers["x-github-event"];
	if (event_type !== "push" && event_type !== "pull_request") {
	    context.log("Ignore '" + event_type + "' event.");
	    context.res = { body: 'Ok' };
	    context.done();
	    return;
	}

	const configkey = data.repository.owner.login + "-" + data.repository.name;
	context.log("Getting config from " + configkey)
	let cfg = yield getBlobToObj("projects", configkey);

	if (event_type === "push") {
	    gdata = {
		after: data.after,
		type: "push",
		repository: {
		    name: data.repository.name,
		    owner: {
			login: data.repository.owner.login
		    }
		}
	    };
	    github_opts = {
		owner: data.repository.owner.login,
		repo: data.repository.name,
		sha: data.after,
		state: "pending"
	    }
	} else if (event_type === "pull_request" && (data.action === "opened" || data.action === "synchronize")) {
	    gdata = {
		after: data.pull_request.head.sha,
		type: "pull_request",
		clone_url: data.pull_request.head.repo.clone_url,
		repository: {
		    name: data.repository.name,
		    owner: {
			login: data.repository.owner.login
		    }
		}
	    };
	    github_opts = {
		owner: data.repository.owner.login,
		repo: data.repository.name,
		sha: data.pull_request.head.sha,
		state: "pending"
	    }
	} else {
	    context.log("Ignore '" + event_type + "' event.");
	    context.res = { body: 'Ok' };
	    context.done();
	    return;
	}

	let message = {
	    uuid: uuidv4(),
	    human_id: moniker.choose(),
	    connection_string: process.env["bbci_STORAGE"],
	    config: cfg,
	    github_data: gdata,
	    ping: ""
	};
	context.log(message);
	context.bindings.outputQueueItem = [message];
	context.log("just before github")
	yield updateGithubStatus(cfg.project.token.trim(), github_opts, context);
	context.log("github status updated!!!");
	context.res = { body: 'Ok' };
	context.done();
    });
};
