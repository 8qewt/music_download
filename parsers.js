var parsers = {};

var push = (filename) => {
    var mod = require(filename);
    parsers[mod.name] = mod;
};

push("./netease/playlist.js");
push("./netease/song.js");

exports.parse = async function(url, func) {
    for (let name in parsers) {
        var result = await parsers[name].parse(url);
        if (result) {
            parsers[name].getInfo(result, func);
        }
    }
}