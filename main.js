#! /usr/bin/env node

"use strict";
const jsdom = require("jsdom");
const {
    JSDOM
} = jsdom;
const fetch = require('node-fetch');
const fs = require('fs');
const ID3Writer = require('browser-id3-writer');
const iconv = require('iconv-lite');

const parse = require('./parsers.js').parse;
const lyricParseing = require('./lyric.js');
const beautfyLyric = lyricParseing.beautfyLyric;
const parseLyric = lyricParseing.parseLyric;
const mergeLyric = lyricParseing.mergeLyric;
const toLrc = lyricParseing.toLrc;
const asyncControl = require("./asyncControl.js").asyncControl;

global.JSDOM = JSDOM;
global.fetch = fetch;
global.iconv = iconv;
global.asyncControl = asyncControl;

global.allflags = ["windowsize", "norename", "charset", "nolyric", "lyriccompress"];

global.flags = [];

function replaceAll(target, res, ...statement) {
    var list = [target];
    statement.forEach(s => {
        var lnew = [];
        list.forEach(str => {
            str.split(s).forEach(after => lnew.push(after))
        });
        list = lnew;
    });
    return list.join(res);
}

function filenameProcess(name) {
    if (global.flags["norename"]) {
        return name;
    }

    name = replaceAll(name, "", "/");

    if (global.flags["windowsize"]) {
        name = replaceAll(name, " ", "\\", ":", "*", "?", "\"", "<", ">", "|");
    }
    return name;
}

async function tagBuffer(buffer, song) {
    const writer = new ID3Writer(buffer);
    writer.setFrame('TIT2', song.title)
        .setFrame('TPE1', song.authors)
        .setFrame('TALB', song.album);
    if (song.cover) {
        let coverBuffer = await fetch(song.cover)
            .then(res => res.buffer());
        writer.setFrame('APIC', {
            type: 3,
            data: coverBuffer,
            description: ""
        });
    }
    writer.addTag();
    return Buffer.from(writer.arrayBuffer);
}

var urls = [];
for (var i = 2; i < process.argv.length; i++) {
    var arg = process.argv[i];
    switch (arg) {
        case "-w":
        case "--windowsize":
            if (!global.flags["windowsize"]) {
                if (global.flags["norename"]) {
                    console.err(`选项冲突：${arg}、--norename。`);
                    process.exit(2);
                }
                global.flags["windowsize"] = true;
            } else {
                console.err(`重复的选项：${arg}。`);
                process.exit(2);
            }
            break;

        case "-n":
        case "--norename":
            if (!global.flags["norename"]) {
                if (global.flags["windowsize"]) {
                    console.err(`选项冲突：${arg}、--windowsize。`);
                    process.exit(2);
                }
                global.flags["norename"] = true;
            } else {
                console.error(`重复的选项：${arg}。`);
                process.exit(2);
            }
            break;


        case "-l":
        case "--nolyric":
            if (!global.flags["nolyric"]) {
                global.flags["nolyric"] = true;
            } else {
                console.error(`重复的选项：${arg}。`);
                process.exit(2);
            }
            break;

        case "-c":
        case "--charset":
            if (global.flags["charset"]) {
                console.error(`重复的选项：${arg}。`);
                process.exit(2);
            } else if (process.argv.length > i + 1) {
                const str = process.argv[i + 1];
                const list = str.split(",").map(s => s.trim());
                if (list.length >= 1) {
                    global.flags["charset"] = list;
                } else {
                    console.error("参数列表为空。");
                    process.exit(2);
                }
                i++;
            } else {
                console.error(`选项${arg}没有参数列表。`);
                process.exit(2);
            }
            break;

        case "-r":
        case "--lyriccompress":
            if (!global.flags["lyriccompress"]) {
                global.flags["lyriccompress"] = true;
            } else {
                console.error(`重复的选项：${arg}。`);
                process.exit(2);
            }

        default:
            if (arg.startsWith("-")) {
                console.error(`未知的选项：${arg}。`);
                process.exit(2);
            }
            urls.push(arg);
            break;
    }
}

var ac = new asyncControl("download", 5);

urls.forEach(url => {
    parse(url, result => {
            result.forEach((song) => {
                ac.append(() => {
                    return new Promise((resolve, reject) => {
                        let name = `${song.authors.join(", ")} - ${song.title}${song.subTitle ? "(" + song.subTitle + ")" : ""}`;
                        name = filenameProcess(name);
                        if (!global.flags["nolyric"] && song.lyric) {
                            let filename = `./${name}.lrc`;
                            let lyric = song.lyric;
                            if (typeof lyric == "string") {
                                lyric = beautfyLyric(lyric, global.flags["lyriccompress"] ? true : false);
                            } else {
                                if (lyric.lyric) {
                                    if (lyric.translate) {
                                        var data = mergeLyric(parseLyric(lyric.lyric), parseLyric(lyric.translate));
                                        lyric = toLrc(data, global.flags["lyriccompress"] ? true : false);
                                    } else {
                                        lyric = beautfyLyric(lyric.lyric, global.flags["lyriccompress"] ? true : false);
                                    }
                                }
                            }
                            if (global.flags["charset"]) {
                                var buf;
                                for (var charset of global.flags["charset"]) {
                                    try {
                                        buf = iconv.encode(lyric, charset);
                                        var res = iconv.decode(buf, charset);
                                        if (res.split("�").length + res.split("?").length > res.length / 30) {
                                            continue;
                                        }
                                        break;
                                    } catch (ex) {
                                        console.log(ex);
                                        continue;
                                    }
                                }
                                if (!buf) {
                                    console.error(`无可用字符集！文件名：${name}`);
                                } else {
                                    fs.writeFile(filename, buf, function(err) {
                                        if (err) console.log(err);
                                        else console.log(`文件已写入：${filename}`)
                                    });
                                }
                            } else {
                                fs.writeFile(filename, lyric, function(err) {
                                    if (err) console.log(err);
                                    else console.log(`文件已写入：${filename}`)
                                });
                            }
                        }
                        if (song.dlURL) {
                            let filename = `./${name}.mp3`;
                            console.log(`文件下载中：${song.dlURL}`);
                            let buffer = fetch(song.dlURL)
                                .then(res => res.buffer())
                                .then((buffer) => {
                                    return tagBuffer(buffer, song);
                                })
                                .then((buffer) => {
                                    fs.writeFile(filename, buffer, function(err) {
                                        if (err) console.log(err);
                                        else console.log(`文件已写入：${filename}`)
                                    });
                                })
                                .then(resolve)
                        } else {
                            resolve();
                        }
                    });
                })
            });
        })
        .catch(ex => console.error(ex));
});

if (urls.length == 0) {
    console.log(`用法：${process.argv[0]} ${process.argv[1]} [选项]... [URL]...
从音乐网站下载音乐文件。（目前只支持网易云音乐）

必选参数对长短选项同时适用。
  -c, --charset             设置保存歌词文件的字符集
  -l, --nolyric             不保存歌词文件
  -n, --norename            禁用文件名替换，保持原有的文件名，即使包含/，可能会造成错误
  -r, --lyriccompress       启用歌词压缩，将重复的歌词合并为一行，可能会造成不兼容
  -w, --windowsize          将下载的文件名中\/:*?"<>|这些符号替换为空格

music_download v0.2.0 by fifth_light`);
}