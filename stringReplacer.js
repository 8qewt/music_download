class stringReplacer {
    constructor(model) {
        this.model = [];
        var inBracket = false;
        var str = "";
        for (var c of model) {
            switch (c) {
                case "{":
                    if (!inBracket) {
                        if (str != "") {
                            this.model.push({
                                type: "string",
                                str
                            });
                            str = "";
                        }
                        inBracket = true;
                    }
                    break;

                case "}":
                    if (inBracket) {
                        inBracket = false;
                        this.model.push({
                            type: "model",
                            str
                        });
                        str = "";
                    }
                    break;

                default:
                    str += c;
            }
        }
        if (str != "") {
            this.model.push({
                type: "string",
                str
            });
            str = "";
        }
    }

    replace(obj) {
        var result = "";
        this.model.map((o) => {
            if (o.type == "model") {
                if (obj[o.str] !== undefined) {
                    result += obj[o.str];
                }
            } else if (o.type == "string") {
                result += o.str;
            }
        });
        return result;
    }
}

exports.stringReplacer = stringReplacer;
