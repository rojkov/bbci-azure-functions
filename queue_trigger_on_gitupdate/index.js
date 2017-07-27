let fs = require("fs");
let path = require("path");

let azureStorage = require('azure-storage');
let msRestAzure = require('ms-rest-azure');
let resourceManagement = require("azure-arm-resource");
let networkManagement = require('azure-arm-network');
let computeManagement = require('azure-arm-compute');

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

function parseAccount(connectionString) {
    let name = null;
    let key = null;

    for (const element of connectionString.split(";")) {
        if (element.startsWith("AccountKey=")) {
            key = element.substring(11);
        } else if (element.startsWith("AccountName=")) {
            name= element.substring(12);
        }
    }

    if (name === null || key === null) {
        throw "Can't parse account: " + connectionString;
    }

    return [name, key];
}

const groupParameters = {
    location: "northeurope"
};
const vnetParameters = {
    location: "northeurope",
    addressSpace: {
	addressPrefixes: [
	    "10.0.0.0/16"
	]
    },
    subnets: [
	{
	    name: "subnet1",
	    addressPrefix: "10.0.0.0/24"
	}
    ]
};
const publicIPParameters = {
    location: "northeurope",
    publicIPAllocationMethod: "Dynamic"
};

module.exports = function (context, queueItem) {
    if (queueItem.ping === "ping") {
	context.done();
	return;
    }
    context.log('JavaScript queue trigger function processed work item', queueItem);
    run(function*() {
        let text = yield getBlobToText("credentials", "credentials.json");
	let { clientId, clientSecret, tenantId, subscriptionId } = JSON.parse(text);
	let cloud_init_tpl = fs.readFileSync(path.join(__dirname, "cloud-init.txt"), "utf8");
	let taskdata = queueItem;
	let taskdata_encoded = new Buffer(JSON.stringify(taskdata)).toString("base64");
	const [accountName, accountKey] = parseAccount(process.env["bbci_STORAGE"]);
	const groupName = queueItem.human_id;
	let cloud_init = new Buffer(cloud_init_tpl.replace("TASKDATA_PLACEHOLDER",
							   taskdata_encoded).replace("HOSTNAME_PLACEHOLDER",
										     queueItem.human_id).replace("STORAGE_USERNAME", accountName).replace("STORAGE_NAME", accountName).replace("STORAGE_PASSWORD", accountKey)).toString("base64");
	let credentials = new msRestAzure.ApplicationTokenCredentials(clientId, tenantId, clientSecret);
	let resourceClient = new resourceManagement.ResourceManagementClient(credentials, subscriptionId);
	let networkClient = new networkManagement(credentials, subscriptionId);
	let computeClient = new computeManagement(credentials, subscriptionId);

	let group = yield resourceClient.resourceGroups.createOrUpdate(groupName, groupParameters);

	let vnet = yield networkClient.virtualNetworks.createOrUpdate(group.name, group.name + "_vnet", vnetParameters);

	let publicIP = yield networkClient.publicIPAddresses.createOrUpdate(group.name, group.name + "_ip", publicIPParameters);

	let subnetInfo = yield networkClient.subnets.get(group.name, group.name + "_vnet", "subnet1");

	let nsg = yield networkClient.networkSecurityGroups.get("bbci", "bbci_nsg");

	const nicParameters = {
	    location: "northeurope",
	    networkSecurityGroup: { id: nsg.id },
	    ipConfigurations: [
		{
		    name: group.name + "_ipconfig",
		    privateIPAllocationMethod: "Dynamic",
		    subnet: { id: subnetInfo.id },
		    publicIPAddress: { id: publicIP.id },
		    primary: true
		}
	    ]
	};
	let nic = yield networkClient.networkInterfaces.createOrUpdate(group.name, group.name + "_nic", nicParameters);
	context.log(nic);

	const vmName = group.name + "vm";
	const vmParameters = {
	    location: "northeurope",
	    hardwareProfile: {
		vmSize: "Standard_A2m_v2" // "Basic_A0"
	    },
	    storageProfile: {
		imageReference: {
		    publisher: "Canonical",
		    offer: "UbuntuServer",
		    sku: "16.04-LTS",
		    version: "latest"
		},
		osDisk: {
		    createOption: "fromImage",
		},
		dataDisks: [
		    {
			lun: 0,
			diskSizeGB: 110,
			createOption: "empty"
		    }
		]
	    },
	    osProfile: {
		computerName: vmName,
		adminUsername: "notadmin",
		adminPassword: "huihuhu6$$DF",
		customData: cloud_init
	    },
	    networkProfile: {
		networkInterfaces: [
		    {
			id: nic.id,
			primary: true
		    }
		]
	    }
	};
	let vm = yield computeClient.virtualMachines.beginCreateOrUpdate(group.name, vmName, vmParameters);
	context.log(vm);

	context.done();
    });
};
