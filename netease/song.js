global.neteaseMusic = global.neteaseMusic || require('simple-netease-cloud-music');
global.neteaseAPI = global.neteaseAPI || new neteaseMusic();

exports.name = "netease_song";
exports.parse = async function(url) {
    var id = false;
    if (url.match("^http(s){0,1}://music.163.com/(#/){0,1}song\\?id=([0-9]+)$")) {
        id = parseInt(url.match("^http(s){0,1}://music.163.com/(#/){0,1}song\\?id=([0-9]+)$")[3]);
    } else if (url.match("^http(s){0,1}://music.163.com/(#/){0,1}m/song\\?id=([0-9]+)$")) {
        id = parseInt(url.match("^http(s){0,1}://music.163.com/(#/){0,1}m/song\\?id=([0-9]+)$")[3]);
    }
    return id;
}
exports.getInfo = async function(id, func, songData) {
    let info;
    if (!songData) {
        info = await neteaseAPI.song(parseInt(id));
        info = info.songs[0];
    } else {
        info = songData;
    }
    let cover = await neteaseAPI.picture(info.al.pic_str || String(info.al.pic), 65535);
    cover = cover.url;
    let title = info.name;
    let album = info.al.name;
    let authors = info.ar.map(artist => artist.name);
    let subTitle = info.alia.join(", ");

    let dlURL;
    let quality = 128;
    if (info.h && info.h.br == 320000) {
        quality = 320;
    } else if (info.m && info.m.br == 192000) {
        quality = 192;
    }
    if (quality == 128) {
        dlURL = `http://music.163.com/song/media/outer/url?id=${id}.mp3`;
    } else {
        dlURL = await neteaseAPI.url(parseInt(id), quality);
        dlURL = dlURL.data[0].url;
    }

    let lyric;
    if (!global.flags["lyric_disable"]) {
        /*
            老的接口方式，没有歌词翻译
            let lyricData = await fetch(`https://music.163.com/api/song/lyric?id=${id}&lv=1`)
                .then(res => res.json());
            if(!lyricData.nolyric && lyricData.lrc && lyricData.lrc.lyric){
                lyric = lyricData.lrc.lyric;
            }
        */
        lyric = await neteaseAPI.lyric(parseInt(id));
        lyric = {
            lyric: lyric.lrc && lyric.lrc.lyric,
            translate: lyric.tlyric && lyric.tlyric.lyric
        };
    }

    func([{
        cover: cover,
        title: title,
        authors: authors,
        album: album,
        subTitle: subTitle,
        lyric: lyric,
        dlURL: dlURL
    }]);
}
