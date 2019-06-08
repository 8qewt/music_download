function timeConvert(time) {
    var minute = Math.floor(time / 60);
    var second = Math.floor(time % 60);
    var milliSecond = Math.floor(time % 1 * 100);
    minute = minute >= 10 ? minute : "0" + minute;
    second = second >= 10 ? second : "0" + second;
    milliSecond = milliSecond >= 10 ? milliSecond : "0" + milliSecond;
    return `${minute}:${second}:${milliSecond}`;
}

exports.parseLyric = (lyric) => {
    var lines = lyric.split("\n");

    var metaDatas = {};
    var textLines = [];

    lines.forEach((line) => {
        if (line.match("^\\[([a-z]+):(.*)\\]$")) {
            var tag = line.match("^\\[([a-z]+):(.*)\\]$");
            metaDatas[tag[1]] = tag[2];
        } else if (line.match("^((\\[([0-9]{2}:[0-9]{2}.([0-9]{1,3}){0,1})\\])+)(.*)$")) {
            var tag = line.match("^((\\[([0-9]{2}:[0-9]{2}.([0-9]{1,3}){0,1})\\])+)(.*)$");
            var timeTag = tag[1];
            var text = tag[tag.length - 1];
            var re = /\[([0-9]{2}):([0-9]{2}).([0-9]{1,3})\]/g;
            var time;
            while (time = re.exec(timeTag)) {
                var milliSecond = time[3].length == 3 ? time[3] * 1 : time[3] * 10;
                textLines.push({
                    time: time[1] * 60 + time[2] * 1 + milliSecond / 1000,
                    text: text
                });
            }
        }
    });
    textLines.sort((a, b) => a.time - b.time);

    return {
        metaDatas,
        textLines
    };
}

exports.toLrc = (data, compress) => {
    var result = "";

    for (var tagname in data.metaDatas) {
        result += `[${tagname}:${data.metaDatas[tagname]}]\n`;
    }

    if (compress) {
        var texts = [];
        data.textLines.forEach((line) => {
            if (!texts.includes(line.text)) texts.push(line.text);
        });
        texts.forEach((text) => {
            var times = [];
            data.textLines.forEach((line) => {
                if (line.text == text) {
                    times.push(line.time);
                }
            });
            times.forEach((time) => {
                result += `[${timeConvert(time)}]`;
            });
            result += text;
            result += "\n";
        });
    } else {
        data.textLines.forEach((line) => {
            result += `[${timeConvert(line.time)}]${line.text}\n`;
        });
    }
    return result;
}

exports.mergeLyric = (lyric1, lyric2) => {
    var result = {
        metaDatas: {},
        textLines: []
    };

    for (var name in lyric1.metaDatas) {
        result.metaDatas[name] = lyric1.metaDatas[name];
    }

    for (var name in lyric2.metaDatas) {
        result.metaDatas[name] = lyric2.metaDatas[name];
    }

    lyric1.textLines.forEach(d => {
        result.textLines.push(d);
    });

    lyric2.textLines.forEach(d => {
        if (d.text.trim()) result.textLines.push(d);
    });

    result.textLines.sort((a, b) => a.time - b.time);

    return result;
}

exports.beautfyLyric = (lyric, compress) => {
    return exports.toLrc(exports.parseLyric(lyric), compress);
}