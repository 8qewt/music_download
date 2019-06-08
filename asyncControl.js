var channels = {};

class asyncControl {
    constructor(channel, maxCount = 5) {
        if (channel != null) {
            this.channel = channel;
            if (!channels[channel]) {
                channels[channel] = {
                    maxCount,
                    count: 0,
                    funcs: []
                };
            }
        } else {
            throw Error("Channel is none.");
        }
    }

    append(func) {
        return new Promise((resolve, reject) => {
            var channel = channels[this.channel];
            if (channel.count >= channel.maxCount) {
                // 等待
                channel.count++;
                channel.funcs.push({
                    func,
                    resolve,
                    reject
                });
            } else {
                channel.count++;

                function doFunc(fun, resolve, reject) {
                    var p = fun();
                    p.then(resolve)
                        .catch(reject)
                        .finally(() => {
                            // 减少计数
                            channel.count--;
                            var fun;
                            if (fun = channel.funcs.shift()) {
                                // 解决积压任务
                                doFunc(fun.func, fun.resolve, fun.reject);
                            }
                        });
                }
                doFunc(func, resolve, reject);
            }
        });
    }
}

exports.asyncControl = asyncControl;