
var canvas;
var width;
var height;

var graph;

var magnification = 1.;
var mouseCenter = [0,0];
var lastMouseCenter = [0,0];
var mouseDragging = false;
var trans = [1,0,0,1,0,0];

var drawCountElement = null;

/// Vector 2D addition
function vecadd(v1,v2){
	return [v1[0] + v2[0], v1[1] + v2[1]];
}

/// Vector 2D scale
function vecscale(v1,s2){
	return [v1[0] * s2, v1[1] * s2];
}

/// Vector 2D distance
function vecdist(v1,v2){
	var dx = v1[0] - v2[0], dy = v1[1] - v2[1];
	return Math.sqrt(dx * dx + dy * dy);
}

/// \brief Calculates product of matrices
///
/// Note that this function assumes arguments augmented matrices, see http://en.wikipedia.org/wiki/Augmented_matrix
/// The least significant suffix is rows.
/// To put it simply, array of coefficients as the same order as parameters to canvas.setTransform().
function matmp(a,b){
	var ret = new Array(6);
	for(var i = 0; i < 3; i++){
		for(var j = 0; j < 2; j++){
			var val = 0;
			for(var k = 0; k < 2; k++)
				val += a[k * 2 + j] * b[i * 2 + k];
			if(i === 2)
				val += a[2 * 2 + j];
			ret[i * 2 + j] = val;
		}
	}
	return ret;
}

window.onload = function() {
	canvas = document.getElementById("scratch");
	if ( ! canvas || ! canvas.getContext ) {
		return false;
	}
	width = parseInt(canvas.style.width);
	height = parseInt(canvas.style.height);
	graph = new Graph(width, height);

	var edit = document.getElementById("freqEdit");
	if(edit !== undefined)
		edit.value = graph.vehicleFreq;
	updateFreq();

	var zoomElement = document.getElementById("zoom");
	var transElement = document.getElementById("trans");
	var mouseElement = document.getElementById("mouse");
	drawCountElement = document.getElementById("drawcount");

	function magnify(f){
		// Prepare the transformation matrix for zooming
		trans = matmp([f, 0, 0, f, (1 - f) * mouseCenter[0], (1 - f) * mouseCenter[1]], trans);

		var result = magnification * f;
		if(result < 1){
			// When fully zoomed out, reset the matrix to identity.
			magnification = 1.;
			trans = [1, 0, 0, 1, 0, 0];
		}
		else
			magnification = result;
		zoomElement.innerHTML = magnification.toString();
		transElement.innerHTML = trans.toString();
	}

	// For Google Chrome
	function MouseWheelListenerFunc(e){
		magnify(0 < e.wheelDelta ? 1.2 : 1. / 1.2);

		// Cancel scrolling by the mouse wheel
		e.preventDefault();
	}

	// For FireFox
	function MouseScrollFunc(e){
		magnify(e.detail < 0 ? 1.2 : 1. / 1.2);

		// Cancel scrolling by the mouse wheel
		e.preventDefault();
	}

	if(canvas.addEventListener){
		canvas.addEventListener("mousewheel" , MouseWheelListenerFunc);
		canvas.addEventListener("DOMMouseScroll" , MouseScrollFunc);
	}

	// It's tricky to obtain client coordinates of a HTML element.
	function getOffsetRect(elem){
		var box = elem.getBoundingClientRect();
		var body = document.body;
		var docElem = document.documentElement;
 
		var clientTop = docElem.clientTop || body.clientTop || 0
		var clientLeft = docElem.clientLeft || body.clientLeft || 0

		var top  = box.top - clientTop
		var left = box.left - clientLeft

		return { top: Math.round(top), left: Math.round(left) }
	}

	canvas.onmousemove = function (e){

		// For older InternetExplorerS
		if (!e)	e = window.event;

		var r = getOffsetRect(canvas);

		mouseCenter[0] = e.clientX - r.left;
		mouseCenter[1] = e.clientY - r.top;

		if(mouseDragging){
			var nextx = trans[4] + mouseCenter[0] - lastMouseCenter[0];
			var nexty = trans[5] + mouseCenter[1] - lastMouseCenter[1];
			if(0 <= -nextx && -nextx < width * (trans[0] - 1))
				trans[4] += mouseCenter[0] - lastMouseCenter[0];
			if(0 <= -nexty && -nexty < height * (trans[3] - 1))
				trans[5] += mouseCenter[1] - lastMouseCenter[1];

			lastMouseCenter[0] = mouseCenter[0];
			lastMouseCenter[1] = mouseCenter[1];
		}
		e.preventDefault();
	};

	canvas.onmousedown = function(e){
		mouseDragging = true;
		mouseElement.innerHTML = "true";

		var r = getOffsetRect(canvas);

		lastMouseCenter[0] = e.clientX - r.left;
		lastMouseCenter[1] = e.clientY - r.top;
	};

	canvas.onmouseup = function(e){
		mouseDragging = false;
		mouseElement.innerHTML = "false";
	};

	var loop = function() {
		draw();
		var timer = setTimeout(loop,100);
	};

	loop();
};

function resetTrans(ctx){
	ctx.setTransform(1,0,0,1,200,200);
}

function updateFreq(){
	var text = document.getElementById("freq");
	text.innerHTML = graph.vehicleFreq;
}

function submitFreq(){
	var edit = document.getElementById("freqEdit");
	if(edit === undefined)
		return;
	var val = parseFloat(edit.value);
	if(isNaN(val))
		return;
	graph.vehicleFreq = val;
	updateFreq();
}

function draw() {
	// A local function to convert a color channel intensity into hexadecimal notation
	function numToHex(d){
		var hex = Math.floor(d * 255).toString(16);

		while(hex.length < 2)
			hex = "0" + hex;

		return hex;
	}

	// A local function to determine road color for showing traffic intensity.
	function roadColor(f){
		return "#" + numToHex((1. + f) / 2.) + "7f7f";
	}

	graph.update(0.1);

	var ctx = canvas.getContext('2d');
	ctx.setTransform(1,0,0,1,0,0);
	ctx.clearRect(0,0,width,height);

	function transform(){
		ctx.setTransform(trans[0], trans[1], trans[2], trans[3], trans[4], trans[5]);
	}

	function hitCheck(pos,radius){
		var x = trans[0] * pos[0] + trans[4];
		var y = trans[3] * pos[1] + trans[5];
		var tr = radius * trans[0]; // Transformed Radius
		return 0 <= x + tr && x - tr < width && 0 <= y + tr && y - tr < height;
	}

	var drawCounts = {}, totalCounts = {};
	for(var i = 0; i < 2; i++){
		var counts = [drawCounts, totalCounts][i];
		counts.edge = counts.vertex = counts.vehicle = counts.signal = 0;
	}

	ctx.font = "bold 16px Helvetica";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	// The first pass of GraphEdge traversal draws asphalt-colored, road-like graphics.
	ctx.strokeStyle = "#000";
	transform();
	for(var i = 0; i < graph.vertices.length; i++){
		var v = graph.vertices[i];
		var pos = v.getPos();
		for(var j in v.edges){
			var e = v.edges[j];
			if(e === undefined)
				continue;

			totalCounts.edge++;

			var dpos = e.end.getPos();

			if(!hitCheck(vecscale(vecadd(pos, dpos), 0.5), vecdist(pos, dpos) / 2. + vertexRadius))
				continue;

			drawCounts.edge++;

			// Color the road with traffic intensity
			ctx.fillStyle = roadColor(e.passCount / e.maxPassCount);

			// Obtain vector perpendicular to the edge's direction.
			var para = new Array(2);
			var perp = new Array(2);
			var length = calcPerp(para, perp, pos, dpos);

			var size = vertexRadius;

			ctx.beginPath();
			ctx.moveTo(pos[0], pos[1]);
			ctx.lineTo(dpos[0], dpos[1]);
			ctx.lineTo(dpos[0] + perp[0] * size, dpos[1] + perp[1] * size);
			ctx.lineTo(pos[0] + perp[0] * size, pos[1] + perp[1] * size);
			ctx.stroke();
			ctx.fill();

			ctx.beginPath();
			ctx.moveTo(e.start.x, e.start.y);
			ctx.lineTo(e.end.x, e.end.y);
			ctx.stroke();
		}
	}

	// The second pass draws vertex circles and ids
	for(var i = 0; i < graph.vertices.length; i++){
		var v = graph.vertices[i];

		totalCounts.vertex++;

		if(!hitCheck(v.getPos(), vertexRadius * trans[0]))
			continue;

		drawCounts.vertex++;

		// Color the crossing with traffic intensity
		ctx.fillStyle = roadColor(v.passCount / v.maxPassCount);
		ctx.beginPath();
		ctx.arc(v.x, v.y, vertexRadius, 0, Math.PI*2, false);
		ctx.stroke();
		ctx.fill();

		ctx.fillStyle = "#000";
		ctx.fillText(v.id, v.x, v.y);
	}

	ctx.font = "bold 12px Helvetica";

	for(var i = 0; i < graph.vehicles.length; i++){
		var v = graph.vehicles[i];
		var spos = new Array(2);
		var epos = new Array(2);
		var pos = v.calcPos(spos, epos);

		totalCounts.vehicle++;

		if(!hitCheck(pos, 7 * trans[0]))
			continue;

		drawCounts.vehicle++;

		var angle = Math.atan2((spos[1] - epos[1]), spos[0] - epos[0]);

		ctx.strokeStyle = v.jammed ? "#f00" : "#000";
		ctx.fillStyle = "#" + numToHex(v.color[0]) + numToHex(v.color[1]) + numToHex(v.color[2]);

		// Reset the transformation to identity
		transform();

		// Construct transformation matrix
		ctx.translate(pos[0], pos[1]);
		ctx.rotate(angle);

		// Actually draw the vehicle's graphic
		ctx.beginPath();
		ctx.moveTo(-6, -3);
		ctx.lineTo(-6,  3);
		ctx.lineTo( 6,  4);
		ctx.lineTo( 6, -4);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	}

	// Reset the transformation for the next drawing
	transform();

	// The third pass for graphs show the traffic signals.
	// This is placed after vehicles rendering because the signals are more important
	// and should not be obscured by vehicles.
	ctx.strokeStyle = "#000";
	for(var i = 0; i < graph.vertices.length; i++){
		var v = graph.vertices[i];

		if(v.countEdges() <= 2)
			continue;

		for(var j in v.edges){
			var e = v.edges[j];
			if(e === undefined)
				continue;

			var tpos = v.getPos();
			var opos = graph.vertices[j].getPos();

			// Obtain vector perpendicular to the edge's direction.
			var para = new Array(2);
			var perp = new Array(2);
			var length = calcPerp(para, perp, tpos, opos);
			var x = v.x + (para[0] - perp[0] * 0.5) * vertexRadius;
			var y = v.y + (para[1] - perp[1] * 0.5) * vertexRadius;

			totalCounts.signal++;

			if(!hitCheck([x, y], 3))
				continue;

			drawCounts.signal++;

			ctx.fillStyle = v.signals[j] === true ? "#f00" : "#0f0";
			ctx.beginPath();
			ctx.arc(x, y, 3, 0, Math.PI*2, false);
			ctx.stroke();
			ctx.fill();
		}
	}

	drawCountElement.innerHTML = "Edges: " + drawCounts.edge + " / " + totalCounts.edge
		+ ", Vertices: " + drawCounts.vertex + " / " + totalCounts.vertex
		+ ", Vehicles: " + drawCounts.vehicle + " / " + totalCounts.vehicle
		+ ", Signals: " + drawCounts.signal + " / " + totalCounts.signal;
}
