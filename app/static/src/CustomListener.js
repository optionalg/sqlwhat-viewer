var antlr = require('antlr4/index');

// This class defines a complete listener for a parse tree produced by ExprParser.
function Listener() {
	antlr.tree.ParseTreeListener.call(this);
    this.nodeMap = {};
    this.nodeEdges = [];
    this.trivialRoot = null;
    this.crnt_id = -1;
    this.makeCytoNode = makeCytoNode;
	return this;
}

Listener.prototype = Object.create(antlr.tree.ParseTreeListener.prototype);
Listener.prototype.constructor = Listener;

Listener.prototype.enterEveryRule = function(ctx) {
    this.crnt_id++;
    ctx.cytoId = this.crnt_id;
    this.nodeMap[this.crnt_id] = this.makeCytoNode(ctx);
    // this is redundant..
    if (isTrivial(ctx) && !this.trivialRoot) this.trivialRoot = ctx.parentCtx.cytoId;
    if (!isTrivial(ctx) && this.trivialRoot) {
        this.nodeEdges.push({
            data: {
                source: this.trivialRoot,
                target: ctx.cytoId
            },
            classes: "collapsed"
        });
        this.trivialRoot = null;
    }
};

Listener.prototype.exitEveryRule = function(ctx) {
    if (!ctx.children) return 

    var edges = this.nodeEdges;
    ctx.children.forEach(function(v){
        edges.push({
            data: {
                id: `${ctx.cytoId}-${v.cytoId}`, 
                source: ctx.cytoId,
                target: v.cytoId
            }
        });
    });

};

Listener.prototype.visitTerminal = Listener.prototype.enterEveryRule;
Listener.prototype.visitErrorNode = Listener.prototype.enterEveryRule;

function makeCytoNode(ctx){
    var start = ctx.start ? ctx.start : ctx.symbol;
    var stop  = ctx.stop  ? ctx.stop  : ctx.symbol;
    var data = {
        id: this.crnt_id,
        text: ctx.getText(),
        // Note, this is because antlr adds Context to end of each
        // name by default. This approach could break if Context is part of
        // nodes actual name
        name: ctx.constructor.name.replace("Context", ""),
        trivial: isTrivial(ctx),
        lineInfo: {
            col_start: start.start,
            line_start: start.line,
            col_end: stop.stop,
            line_end: stop.line
        }
    }

    if (ctx.constructor.name == "TerminalNodeImpl") var classes = "terminal";
    else if (ctx.constructor.name == "ErrorNodeImpl") var classes = "error";
    else var classes = "context";

    return {data, classes}
};

function tokenToCytoNode(ctx){
    var data = {
        id: this.crnt_id,
        text: ctx.getText(),
        name: ctx.constructor.name,
        lineInfo: {
            col_start: ctx.symbol.column,
            line_start: ctx.symbol.line,
            col_end: ctx.symbol.column,
            line_end: ctx.symbol.line
        }
    }
}

function isTrivial(ctx){
    if (   
           ctx.parentCtx != null 
        && ctx.parentCtx.children.length == 1 
        && ctx.children != null
        && ctx.children.length == 1
        && ctx.children[0].constructor.name != "TerminalNodeImpl"
        ) return true
    else return false
}

// visitErrorNode
// visitTerminal
//
//
// ---------------
function parseFromGrammar(grammar, data, start) {
    var chars = new antlr.InputStream(data);
    var lexer = new grammar.Lexer(chars);
    var tokens  = new antlr.CommonTokenStream(lexer);
    var parser = new grammar.Parser(tokens);
    parser.buildParseTrees = true;

    var tree = parser[start]();
    var listener = new Listener();
    antlr.tree.ParseTreeWalker.DEFAULT.walk(listener, tree);

    var elements =  {
        nodes: Object.keys(listener.nodeMap).map(key => listener.nodeMap[key]),
        edges: listener.nodeEdges
    };
    return elements
}

module.exports = {Listener, parseFromGrammar};
