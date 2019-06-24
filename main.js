#! /usr/bin/env node

"use strict";
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
const stringReplacer = require("./stringReplacer.js").stringReplacer;

global.fetch = fetch;
global.iconv = iconv;
global.asyncControl = asyncControl;
global.stringReplacer = stringReplacer;

global.allflags = ["lyric_charset", "lyric_disable", "lyric_compress", "lyric_translate_format",
    "lyric_no_translate", "lyric_translate_offset", "filename_format", "filename_no_rename",
    "filename_windowsize", "download_max_count"
];

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

var filenameFormatReplacer;

function filenameFormat(song) {
    var result;
    if(global.flags["filename_format"] && !filenameFormatReplacer){
        filenameFormatReplacer = new stringReplacer(global.flags["filename_format"]);
    }
    if(global.flags["filename_format"]){
        result = filenameFormatReplacer.replace({
            name: song.title,
            subname: song.subTitle,
            artist: song.authors.join(", ")
        });
    } else {
        result = `${song.authors.join(", ")} - ${song.title}${song.subTitle ? "(" + song.subTitle + ")" : ""}`;
    }
    return filenameProcess(result);
}

function filenameProcess(name) {
    if (global.flags["filename_no_rename"]) {
        return name;
    }

    name = replaceAll(name, "", "/");

    if (global.flags["filename_windowsize"]) {
        name = replaceAll(name, " ", "\\", ":", "*", "?", "\"", "<", ">", "|");
    }
    return name;
}

var lyricFormatReplacer;

function lyricProcess(song) {
    if (!global.flags["lyric_disable"] && song.lyric) {
        if(global.flags["lyric_translate_format"] && !lyricFormatReplacer){
            lyricFormatReplacer = new stringReplacer(global.flags["lyric_translate_format"]);
        }
        let lyric = song.lyric;
        if (typeof lyric == "string") {
            lyric = beautfyLyric(lyric, global.flags["lyric_compress"] ? true : false);
        } else {
            if (lyric.lyric) {
                if (lyric.translate && !global.flags["lyric_no_translate"]) {
                    if(global.flags["lyric_translate_format"]){
                        var data = parseLyric(lyric.lyric);
                        var tdata = parseLyric(lyric.translate);
                        var result = {metaDatas: {}, textLines: []};
                        data.textLines.forEach((t) => {
                            var res;
                            for (var line of tdata.textLines) {
                                if (line.time == t.time) {
                                    res = line;
                                    break;
                                }
                            }

                            if (res) {
                                result.textLines.push({time: t.time, text: lyricFormatReplacer.replace({
                                    original: t.text,
                                    translate: res.text
                                })});
                            } else {
                                result.textLines.push({time: t.time, text: t.text});
                            }

                            for (var name in data.metaDatas) {
                                result.metaDatas[name] = data.metaDatas[name];
                            }

                            for (var name in tdata.metaDatas) {
                                result.metaDatas[name] = tdata.metaDatas[name];
                            }

                            lyric = toLrc(result, global.flags["lyric_compress"] ? true : false);
                        });
                    } else {
                        var data = mergeLyric(parseLyric(lyric.lyric), parseLyric(lyric.translate), global.flags["lyric_translate_offset"] ? global.flags["lyric_translate_offset"] : 0);
                        lyric = toLrc(data, global.flags["lyric_compress"] ? true : false);
                    }
                } else {
                    lyric = beautfyLyric(lyric.lyric, global.flags["lyric_compress"] ? true : false);
                }
            }
        }
        if (global.flags["lyric_charset"]) {
            var buf;
            for (var charset of global.flags["lyric_charset"]) {
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
            if (!buf) console.error(`无可用字符集！文件名：${name}`);
            return buf;
        } else {
            return Buffer.from(lyric);
        }
    }
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
            if (!global.flags["filename_windowsize"]) {
                if (global.flags["filename_no_rename"]) {
                    console.err(`选项冲突：${arg}、--norename。`);
                    process.exit(2);
                }
                global.flags["filename_windowsize"] = true;
            } else {
                console.err(`重复的选项：${arg}。`);
                process.exit(2);
            }
            break;

        case "-n":
        case "--norename":
            if (!global.flags["filename_no_rename"]) {
                if (global.flags["filename_windowsize"]) {
                    console.err(`选项冲突：${arg}、--windowsize。`);
                    process.exit(2);
                }
                global.flags["filename_no_rename"] = true;
            } else {
                console.error(`重复的选项：${arg}。`);
                process.exit(2);
            }
            break;


        case "-l":
        case "--lyric-disable":
            if (!global.flags["lyric_disable"]) {
                global.flags["lyric_disable"] = true;
            } else {
                console.error(`重复的选项：${arg}。`);
                process.exit(2);
            }
            break;

        case "-c":
        case "--lyric-charset":
            if (global.flags["lyric_charset"]) {
                console.error(`重复的选项：${arg}。`);
                process.exit(2);
            } else if (process.argv.length > i + 1) {
                const str = process.argv[i + 1];
                const list = str.split(",").map(s => s.trim());
                if (list.length >= 1) {
                    global.flags["lyric_charset"] = list;
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
        case "--lyric-compress":
            if (!global.flags["lyric_compress"]) {
                global.flags["lyric_compress"] = true;
            } else {
                console.error(`重复的选项：${arg}。`);
                process.exit(2);
            }
            break;

        case "-a":
        case "--download-max-count":
            if (global.flags["download_max_count"]) {
                console.error(`重复的选项：${arg}。`);
                process.exit(2);
            } else if (process.argv.length > i + 1) {
                global.flags["download_max_count"] = parseInt(process.argv[i + 1]);
                i++;
            } else {
                console.error(`选项${arg}没有参数列表。`);
                process.exit(2);
            }
            break;

        case "-f":
        case "--filename_format":
            if (global.flags["filename_format"]) {
                console.error(`重复的选项：${arg}。`);
                process.exit(2);
            } else if (process.argv.length > i + 1) {
                global.flags["filename_format"] = process.argv[i + 1];
                i++;
            } else {
                console.error(`选项${arg}没有参数列表。`);
                process.exit(2);
            }
            break;

        case "-k":
        case "--translate-format":
            if (global.flags["lyric_translate_format"]) {
                console.error(`重复的选项：${arg}。`);
                process.exit(2);
            } else if (global.flags["lyric_translate_offset"]) {
                console.err(`选项冲突：${arg}、--translate-offset。`);
                process.exit(2);
            } else if (process.argv.length > i + 1) {
                global.flags["lyric_translate_format"] = process.argv[i + 1];
                i++;
            } else {
                console.error(`选项${arg}没有参数列表。`);
                process.exit(2);
            }
            break;

        case "-d":
        case "--translate-offset":
            if (global.flags["filename_offset"]) {
                console.error(`重复的选项：${arg}。`);
                process.exit(2);
            } else if (global.flags["lyric_translate_format"]) {
                console.err(`选项冲突：${arg}、--translate-format。`);
                process.exit(2);
            } else if (process.argv.length > i + 1) {
                global.flags["lyric_translate_offset"] = parseInt(process.argv[i + 1]);
                i++;
            } else {
                console.error(`选项${arg}没有参数列表。`);
                process.exit(2);
            }
            break;

        case "-m":
        case "--lyric-no-translate":
            if (!global.flags["lyric_no_translate"]) {
                global.flags["lyric_no_translate"] = true;
            } else {
                console.error(`重复的选项：${arg}。`);
                process.exit(2);
            }
            break;

        default:
            if (arg.startsWith("-")) {
                console.error(`未知的选项：${arg}。`);
                process.exit(2);
            }
            urls.push(arg);
            break;
    }
}

var ac = new asyncControl("download", global.flags["download_max_count"] ? global.flags["download_max_count"] : 5);

urls.forEach(url => {
    parse(url, result => {
            result.forEach((song) => {
                ac.append(() => {
                    return new Promise((resolve, reject) => {
                        let name = filenameFormat(song);
                        let buf = lyricProcess(song);
                        if (buf) {
                            let filename = `./${name}.lrc`
                            fs.writeFile(filename, buf, function(err) {
                                if (err) console.log(err);
                                else console.log(`文件已写入：${filename}`)
                            });
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
-a, --download-max-count  并行下载的最高数量，默认为5
-c, --lyric-charset       设置保存歌词文件的字符集
-d, --translate-offset    将翻译与歌词放在不同的行中，并设置翻译的偏移度，单位为秒
-f, --filename_format     设置文件名与歌词的格式字符串，可用的替换字符串：name：歌名 subname：歌曲附加名 artist：艺术家
-k, --translate-format    设置下载歌词的格式字符串，可用的替换字符串：original：原歌词 translate：翻译（将翻译与歌词放在同一行）
-l, --lyric-disable       不保存歌词文件
-m, --lyric-no-translate  不使用歌词翻译
-n, --norename            禁用文件名替换，保持原有的文件名，即使包含/，可能会造成错误
-r, --lyric-compress      启用歌词压缩，将重复的歌词合并为一行，可能会造成不兼容
-w, --windowsize          将下载的文件名中\\/:*?"<>|这些符号替换为空格

music_download v0.3.0 by fifth_light`);
}
