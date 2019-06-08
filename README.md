# music_download #

**一个Javascript命令行音乐下载器，目前只支持网易云音乐**

## Feature ##
1. 给下载好的MP3文件打ID3标签（封面，歌手，歌名……）
2. 批量下载歌单中歌曲
3. 同时只下5个文件（否则内存占用会很多）
3. 下载LRC歌词，并且如果翻译可用的话把翻译歌词合并到未翻译歌词中

## 安装 ##
1. 使用`git clone`来拉取最新版本，或者下载一个release
2. 在项目文件夹中输入`npm i`来安装依赖库

## 使用 ##
** Linux / Unix **

    ./main.js [参数]... <歌单/歌曲链接>

** Windows **

    node main.js [参数]... <歌单/歌曲链接>
