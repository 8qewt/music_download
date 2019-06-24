var stringReplacer = require("../stringReplacer.js").stringReplacer;

var sr1 = new stringReplacer("Hello, {text}! You are {name}");
if(sr1.replace({text: "World", name: "fifth_light"}) != "Hello, World! You are fifth_light"){
    console.error(`Should be:Hello, World! You are fifth_light,
but it is: sr1.replace({text: "World", name: "fifth_light"})`);
    process.exit(1);
}
