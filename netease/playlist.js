global.neteaseMusic = global.neteaseMusic || require('simple-netease-cloud-music');
global.neteaseAPI = global.neteaseAPI || new neteaseMusic();

var songParser = require("./song.js");

exports.name = "netease_playlist";
exports.parse = async function(url) {
    var id = false;
    if (url.match("^http(s){0,1}://music.163.com/(#/){0,1}playlist\\?id=([0-9]+)$")) {
        id = parseInt(url.match("^http(s){0,1}://music.163.com/(#/){0,1}playlist\\?id=([0-9]+)$")[3]);
    } else if (url.match("^http(s){0,1}://music.163.com/(#/){0,1}my/m/music/playlist\\?id=([0-9]+)$")) {
        id = parseInt(url.match("^http(s){0,1}://music.163.com/(#/){0,1}my/m/music/playlist\\?id=([0-9]+)$")[3]);
    }
    return id;
}

exports.getInfo = async function(id, func) {
    /*
        JSDOM老方法
        let text = await fetch(`https://music.163.com/playlist?id=${id}`)
            .then(res => res.text());
        let dom = new JSDOM(text);
        let songs = dom.window.document.querySelectorAll("ul.f-hide > li > a");
        var result = [];
        for await (let song of songs) {
            var id = parseInt(song.href.match("^/song\\?id=([0-9]+)$")[1]);
            songParser.getInfo(id, func);
        }
    */
    let info = await neteaseAPI.playlist(id);
    info.playlist.tracks.forEach((data) => {
        let sid = data.id;
        songParser.getInfo(sid, func, data);
    });
}