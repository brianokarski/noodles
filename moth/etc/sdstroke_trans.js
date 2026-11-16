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
			var point = shape.curves[k].getPoint1();
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
ruler1: {
		type: 'ruler', label: 'back'
	},
	bC: { type: 'number', label: 'C' ,value: 100, range: [0, 100]},
	bM: { type: 'number', label: 'M' ,value: 0, range: [0, 100]},	
	bY: { type: 'number', label: 'Y' ,value: 0, range: [0, 100]},
	bK: { type: 'number', label: 'K' ,value: 0, range: [0, 100]},
	bW: { type: 'number', label: 'W' ,value: 8,fractionDigits: 1},

ruler2: {
		type: 'ruler', label: 'front'
	},
	fC: { type: 'number', label: 'C' ,value: 0, range: [0, 100]},
	fM: { type: 'number', label: 'M' ,value: 0, range: [0, 100]},	
	fY: { type: 'number', label: 'Y' ,value: 0, range: [0, 100]},
	fK: { type: 'number', label: 'K' ,value: 0, range: [0, 100]},
	fW: { type: 'number', label: 'W' ,value: 0.2,fractionDigits: 1},
	
ruler3: {
		type: 'ruler'
	},
	step: { type: 'number', label: 'Step' ,value: 0, range: [0, 30]},
	rotate: { type: 'number', label: 'Rotate' ,value: 0},	
	scale: { type: 'number', label: 'Scale' },
	moveX: { type: 'number', label: 'moveX' ,value: 0, },
	moveY: { type: 'number', label: 'moveY' ,value: 0, },
	
	 transButton : {
		type: 'button', value: 'translation',
		onClick: function() {
var estep=components.step.value;
var erotate=components.rotate.value;	
var escale=components.scale.value;	
var emvx=components.moveX.value;	
var emvy=components.moveY.value;

var bc=components.bC.value;
var bm=components.bM.value;
var by=components.bY.value;
var bk=components.bK.value;
var bwidth=components.bW.value;

var fc=components.fC.value;
var fm=components.fM.value;	
var fy=components.fY.value;	
var fk=components.fK.value;	
var fwidth=components.fW.value;			

var stepi=0;

		var black,cyan,magenta,yellow,alpha
		var art = new Path();		
		var shapes =  activeDocument.getItems({ 
    type: Path, 
    selected: true
	});	

   for (stepi=0; stepi<=estep; stepi++) { 
	
		for (var j = 0; j <shapes.length; j++) 			
	{			
	var art = shapes[j];
//
	var mvx=stepi*emvx/estep;
	var mvy=stepi*emvy/estep;
	var scale=(100-stepi*(100-escale)/estep)/100;
	var rotate=stepi*erotate/estep;	
	var cyan=bc-stepi*(bc-fc)/estep;
	var magenta=bm-stepi*(bm-fm)/estep;
	var yellow=by-stepi*(by-fy)/estep;
	var black=bk-stepi*(bk-fk)/estep ;
	var width=bwidth-stepi*(bwidth-fwidth) / estep;
		
	var sdColor=new CMYKColor(cyan/100,magenta/100,yellow/100,black/100,alpha/100);	
		
	art=art.clone();
	var targetPoint = art.bounds.center; 

	art.style.stroke.width=width;
	art.style.stroke.color=sdColor;
	
	art.translate(new Point(mvx, mvy));
	var targetPoint = art.bounds.center; 	

	art.scale(scale,scale);
	var scalePos = art.bounds.center;
	var move = targetPoint.subtract(scalePos);
	art.translate(move);
	var targetPoint = art.bounds.center; 

	art.rotate(rotate,targetPoint);
	var rotatePos = art.bounds.center;
	var move = targetPoint.subtract(rotatePos);
	art.translate(move);
//
		print('::stepi: '+stepi);
		}
	}	
	stepi=0;width=0;scale=0;rotate=0;
}
		
	}
}

var palette = new Palette('Translation', components, values);
