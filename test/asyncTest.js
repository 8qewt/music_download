#! /usr/bin/env node

var asyncControl = require("../asyncControl.js").asyncControl;


function test(name, maxCount, num) {
    var ac = new asyncControl(name, maxCount);

    var gen = (() => {
        var i = 0;
        var count = 0;
        return (() => {
            return new Promise((resolve, reject) => {
                let n = i++;
                count++;
                if (count > maxCount) {
                    console.error(`count > maxCount, count: ${count}, maxCount: ${maxCount}`);
                    process.exit(1);
                }
                setTimeout(() => {
                    count--;
                    resolve(n);
                }, Math.random() * 100);
            });
        });
    })();

    for (var i = 0; i < num; i++) {
        ac.append(gen).then((d) => {});
    }
}

for (var i = 0; i < 64; i++) {
    test(i, Math.floor(Math.random() * 64), i);
}