let msRestAzure = require('ms-rest-azure');
let azureStorage = require('azure-storage');
let resourceManagement = require("azure-arm-resource");

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

module.exports = function (context, queueItem) {
    if (queueItem.ping === "ping") {
	context.done();
	return;
    }
    context.log('Queue trigger for build results processes work item', queueItem);
    run(function*() {
        let text = yield getBlobToText("credentials", "credentials.json");
	let { clientId, clientSecret, tenantId, subscriptionId } = JSON.parse(text);
	context.log(clientSecret);
	const groupName = queueItem.human_id;
	let credentials = new msRestAzure.ApplicationTokenCredentials(clientId, tenantId, clientSecret);
	let resourceClient = new resourceManagement.ResourceManagementClient(credentials, subscriptionId);

	yield resourceClient.resourceGroups.beginDeleteMethod(groupName);
	context.log("Started deleting", groupName);
	context.done();
    });
};
