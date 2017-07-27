module.exports = function (context, keepwarmTimer) {
    const message = {
        ping: "ping"
    };
    
    context.bindings.ping1QueueItem = [message];
    context.bindings.ping2QueueItem = [message];
    context.done();
};
