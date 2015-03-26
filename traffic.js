
var canvas;
var width;
var height;

var graph;

window.onload = function() {
	canvas = document.getElementById("scratch");
	if ( ! canvas || ! canvas.getContext ) {
		return false;
	}
	width = parseInt(canvas.style.width);
	height = parseInt(canvas.style.height);
	graph = new Graph(width, height);

	var loop = function() {
		draw();
		var timer = setTimeout(loop,100);
	};

	loop();
};

function clockModel(ctx,col){
	ctx.fillStyle = "#000";
	ctx.beginPath();
	ctx.moveTo(0.025, 0.2);
	ctx.lineTo(0.05, 0.);
	ctx.lineTo(0.025, -1);
	ctx.lineTo(-0.025, -1);
	ctx.lineTo(-0.05, 0.);
	ctx.lineTo(-0.025, 0.2);
	ctx.closePath();
	ctx.fill();
}

function resetTrans(ctx){
	ctx.setTransform(1,0,0,1,200,200);
}

function draw() {
	graph.update(0.1);

	var ctx = canvas.getContext('2d');
	ctx.clearRect(0,0,width,height);

	ctx.font = "bold 16px Helvetica";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	ctx.strokeStyle = "#000";
	ctx.fillStyle = "#000";
	ctx.setTransform(1,0,0,1,0,0);
	for(var i = 0; i < graph.vertices.length; i++){
		var v = graph.vertices[i];
		ctx.beginPath();
		ctx.arc(v.x, v.y, 10, 0, Math.PI*2, false);
		ctx.stroke();
		ctx.fillText(v.id, v.x, v.y);
		for(var j = 0; j < v.edges.length; j++){
			var e = v.edges[j];
			if(e == undefined)
				continue;
			ctx.beginPath();
			ctx.moveTo(e.start.x, e.start.y);
			ctx.lineTo(e.end.x, e.end.y);
			ctx.stroke();
		}
	}

	ctx.strokeStyle = "#f00";
	ctx.fillStyle = "#0ff";
	for(var i = 0; i < graph.vehicles.length; i++){
		var v = graph.vehicles[i];
		var pos = v.calcPos();
		ctx.beginPath();
		ctx.arc(pos[0], pos[1], 7.5, 0, Math.PI*2, false);
		ctx.fill();
		ctx.stroke();
	}
}