global.neteaseMusic = global.neteaseMusic || require('simple-netease-cloud-music');
global.neteaseAPI = global.neteaseAPI || new neteaseMusic();
global.asyncControl = global.asyncControl || require('./../asyncControl.js').asyncControl;

var songParser = require("./song.js");

exports.name = "netease_playlist";
exports.parse = async function(url) {
    var id = false;
    if (url.match("^http(s){0,1}://music.163.com/(#/){0,1}playlist\\?id=([0-9]+)$")) {
        id = parseInt(url.match("^http(s){0,1}://music.163.com/(#/){0,1}playlist\\?id=([0-9]+)$")[3]);
    } else if (url.match("^http(s){0,1}://music.163.com/(#/){0,1}my/m/music/playlist\\?id=([0-9]+)$")) {
        id = parseInt(url.match("^http(s){0,1}://music.163.com/(#/){0,1}my/m/music/playlist\\?id=([0-9]+)$")[3]);
    } else if (url.match("^http(s){0,1}://music.163.com/(#/){0,1}m/playlist\\?id=([0-9]+)$")) {
        id = parseInt(url.match("^http(s){0,1}://music.163.com/(#/){0,1}m/playlist\\?id=([0-9]+)$")[3]);
    }
    return id;
}

var ac = new global.asyncControl("playlist", 5);

exports.getInfo = async function(id, func) {
    let info = await neteaseAPI.playlist(id);
    info.playlist.trackIds.forEach((data) => {
        let sid = data.id;
        // 没有data了 很可惜
        ac.append(async () => {
            await songParser.getInfo(sid, func, null);
            console.error(`网易云音乐歌单${id}: 获取歌曲${sid}的信息`)
        });
    });
}