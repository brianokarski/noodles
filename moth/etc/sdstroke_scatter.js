// stroke_itrans.jp
// Sunabe kazumichi 2009
// http://dp48069596.lolipop.jp/
//scriptographer.2.9.073-arrived/

function ungroupRecoursiveAndCtp(groupObj) {
	var countOfGroupObjects = null; 
	var obj = groupObj.getChildren(); 
	countOfGroupObjects = obj.length; 
		var reGroup = new Group(); 
	
	for (var n = 0; n < countOfGroupObjects; n++){
		if(obj[n].hasChildren()) {
				groupObjs.push(obj[n]); 
				ungroupRecoursiveAndCtp(obj[n]); 
		}
		else {
			gPaths.push(obj[n]); 
			reGroup.appendChild(ctp(obj[n]));
		}
	}
}

function ctp(shape){
	var dist=components.dist.value;
	var density=components.density.value;
	var offset=components.offset.value;
	
	shape.curvesToPoints(dist,10000);
	var count = shape.curves.size();
	for(var k=0;k<count;k++){
		for(var n=0;n<density;n++){
			switch(n%2){
			case 1: // half the dots with positive random values
				var x = randomBetweenFloat(0,offset);
				var y = randomBetweenFloat(0,offset);
				break;
			default: // half the dots with negative random values
				var x = -1 * randomBetweenFloat(0,offset);
				var y = -1 * randomBetweenFloat(0,offset);
			}
			var point = shape.curves[k].getPoint(1);
			var randomizedPoint = point.add(x,y); // add the offset to the point
			dotPoints.push(randomizedPoint);
		}
	}
	return shape;
}

function targetDot(){
	dot = null;	
	var selectedItems = document.selectedItems;	
	if(selectedItems.length == 0)	{
		dbug('no objects selected -> nothing will happen...');
		return;
	}	
	if (selectedItems.length >= 1){
		dot = selectedItems;
		if (selectedItems.length == 1){
		}else{
			dbug(selectedItems.length + ' objects selected');
		}
	}
}

function targetStroke() {
shapes = null;
	var selectedItems = document.selectedItems;
	if(selectedItems.length == 0){
		return;
	}else{
		shapes = selectedItems;
	}	
}

function randomBetweenFloat(min,max){
	min = parseFloat(min);
	max = parseFloat(max);
	return Math.random() * (max - min) + min;
}

function randomBetween(min,max){
	min = parseFloat(min);
	max = parseFloat(max);
	return Math.round(Math.random() * (max - min) + min);
}

function dbug(msg){if (true)
		print('::debug: '+msg);
}

// ------------------------  Dialog stuff  ------------------------ 
var values = {
	text: 'Translation',
	size: 10,
	scale: 100,
	count: 0,

};
var components = {

//	random: { type: 'boolean', label: 'random',value:true},
	dist: { type: 'number', label: 'dist' ,value: 1.4,fractionDigits: 1},
	density: { type: 'number', label: 'density' ,value: 3,fractionDigits: 1},
	
ruler2: {
		type: 'ruler', 
	},
	rotate: { type: 'number', label: 'rotate' ,value: 0},	
	scale: { type: 'number', label: 'scale',value: 100 },
	offset: { type: 'number', label: 'offset' ,value: 0, },
	
	 scatterButton : {
		type: 'button', value: 'scatter',
		onClick: function() {
			
var rotate=components.rotate.value;
var scale=components.scale.value;
var prandom=true; //prandam only true

	try{ 
		for(var i=0;i<dot.length;i++)
		{
			var working = dot[i].isValid();
			if(working)
			{
				dbug('the dot-object is valid: '+dot[i]);
			}else{
				print('::error: one dot-object is not valid, is it still existent?');
				return;
			}
		}
	}catch(e){ 
		print('::error: there is no dot-object, did you assign a dot-object via dialog?');
		return;
	}
	
	try{
		var working = shapes[0].isValid();
		if(working)
		{
			dbug('the shapes are valid: '+shapes);
		}else{
			print('::error: shape values are not valid, are they still existent?');
			return;
		}
	}catch(e){
		print('::error: there are no shapes, did you assign a shape via dialog?');
		return;
	}
	
	dbug('shapes are now: '+shapes);
	dbug('dot-objects are now: '+dot);
	
	for(var i=0;i<dot.length;i++)
	{
		var zeroPoint = new Point(0,0);
		var currentPos = dot[i].bounds.center;
		var move = zeroPoint - currentPos;
		dot[i].translate(move);		
	}	
	gPaths = new Array();
	groupObjs = new Array();
	dotPoints = new Array();
	for(var i=0;i<shapes.length;i++)
	{
		var shape = shapes[i];
		if (shape != null) 
		{
			if(shape.hasChildren()) 
			{
				ungroupRecoursiveAndCtp(shape); 
			}
			else 
			{
				ctp(shape);
			}
		}
	}
		
	var finalGroup = new Group();
	
	for(var m=0;m<dotPoints.length;m++)
	{
		var currentPoint = dotPoints[m];
		
		var x = currentPoint.x;
		var y = currentPoint.y;
		var rndDotNr = randomBetween(0, dot.length - 1);
		var dotClone = dot[rndDotNr].clone();
		dotClone.translate([x,y]);		
//
if(prandom){
		// rotate  the obj
			var angle = (Math.random() * rotate) ; /// (Math.random() * rotate) * Math.PI/180; 
			var dotCenterPoint = dotClone.bounds.center; 
			dotClone.rotate(angle,dotCenterPoint); 		
		//  scale the obj
			var maxScaleFactor = (scale / 100);
			if(maxScaleFactor>=1){
				var randomScaleFactor = randomBetweenFloat(1,maxScaleFactor);
			}
			else
				var randomScaleFactor = randomBetweenFloat(maxScaleFactor,1);
			var targetPos = dotClone.bounds.center;
			dotClone.scale(randomScaleFactor,randomScaleFactor);
			var currPos = dotClone.bounds.center;
			var move = targetPos - currPos;
			dotClone.translate(move);
	}
	else {
		// rotate  the obj	
			var angle =rotate//rotate* Math.PI/180; 
			var dotCenterPoint = dotClone.bounds.center; 
			dotClone.rotate(angle,dotCenterPoint); 
		//  scale the obj	
			var maxScaleFactor = (scale / 100);
			var targetPos = dotClone.bounds.center;
			dotClone.scale(maxScaleFactor,maxScaleFactor);
			var currPos = dotClone.bounds.center;
			var move = targetPos - currPos;
			dotClone.translate(move);
	}	
		finalGroup.appendChild(dotClone);
	}	
}
},

	strokeButton : {
		type: 'button', value: 'Stroke',
		onClick: function() {
	
	targetStroke();
	}
},

//Dot division selection
dotButton : {
		type: 'button', value: 'Dot',
		onClick: function() {

	targetDot();
	}
},
}

var palette = new Palette('RandomScatter', components, values);
