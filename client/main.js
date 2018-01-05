import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import './main.html';

Meteor.subscribe("parameters");
Meteor.subscribe("banks");
Meteor.subscribe("presets");
Meteor.subscribe("settings");
Meteor.subscribe("parameter-undo");

Template.screen.onRendered(function () {
	Template.instance().viewer = { x:0.0, y:0.0, z:0.0 };
});

var currentScale = 1.0;

function updateScale(v, amount) {
	var oldZ = Math.pow(2, v.z);
	v.z += amount;
	currentScale = Math.pow(2, v.z);
	
	$(".zoom-pane").css({transform: "scale(" + currentScale + ")"});
	
	if(currentScale < 1 && oldZ >= 1) {
		$("div.param-value").hide();
	}
	else if(currentScale >= 1 && oldZ < 1) {
		$("div.param-value").show();
	}
	
	if(currentScale < 0.75 && oldZ >= 0.75) {
		$("div.param-title").hide();
	}
	else if(currentScale >= 0.75 && oldZ < 0.75) {
		$("div.param-title").show();
	}
}

var pointerInfo = {
	control: null,
	x: 0,
	y: 0,
	capture: function(instance, event, x, y) {
		var isDifferent = (this.control != instance);
		this.control = instance;
		this.x = x;
		this.y = y;
		return isDifferent;
	},
	release: function() {
		if(this.control) {
			if(this.control.onRelease)
				this.control.onRelease();
			this.control = null;
		}
	},
	mouseMove: function(x, y) {
		if(this.x == undefined) {
			this.x = x;
			this.y = y;
		}
		
		if(this.control) {
			var diffX = x - this.x;
			var diffY = y - this.y;
			this.x = x;
			this.y = y;

			if(this.control.onMove) {
				this.control.onMove(x, y, diffX, diffY);
			}
		}
	}
};

Template.screen.onCreated(function() {
	this.onMove = function(x, y, diffX, diffY) {
		var f = document.activeElement;
		if(f.tagName == "BODY") {
			var v = Template.instance().viewer;
			v.x += diffX;
			v.y += diffY;
			$(".move-pane").css({left: v.x, top: v.y});
		}
	}
});

Template.screen.helpers({
	getBanks: function () {
		return Banks.find({});
	}
})

Template.screen.events({
	"click #importCSV" (event) {
		Meteor.call("importCSV");
	},
	"click #undo" (event) {
		undo.undo();
	},
	"click #redo" (event) {
		undo.redo();
	},
	"touchstart .screen" (event) {
		pointerInfo.capture(Template.instance(), event, event.originalEvent.touches[0].screenX, event.originalEvent.touches[0].screenY);
	},
	"touchmove .screen" (event) {
		if(event.originalEvent.touches.length == 2) {
			event.preventDefault();
			var a = event.originalEvent.touches[0];
			var b = event.originalEvent.touches[1];
			var xDiff = a.screenX - b.screenX;
			var yDiff = a.screenY - b.screenY;
			var dist = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
				
			if(Template.instance().pinchDist) {
				var pinchDelta = dist - Template.instance().pinchDist;
				Template.instance().pinchDist = dist;
				var v = Template.instance().viewer;
					
				var xPos = (a.screenX + b.screenX) / 2;
				var yPos = (a.screenY + b.screenY) / 2;
					
				var zoomPane = $(".zoom-pane");
				var offset = zoomPane.offset();
				var scaleFactor = Math.pow(2, v.z);
					
				var x = (xPos - offset.left) / (zoomPane.width() * scaleFactor);
				var y = (yPos - offset.top) / (zoomPane.height() * scaleFactor);
					
				updateScale(v, pinchDelta / 100);
				
				scaleFactor = Math.pow(2, v.z);
					
				var newEventX = x * scaleFactor * zoomPane.width() + offset.left;
				var newEventY = y * scaleFactor * zoomPane.height() + offset.top;
					
				offset.left -= (newEventX - xPos);
				offset.top -= (newEventY - yPos);
									
				zoomPane.offset({left: offset.left, top: offset.top});
			}
			else {
				Template.instance().pinchDist = dist;
			}
		} else {
			pointerInfo.mouseMove(event.originalEvent.touches[0].screenX , 
							   event.originalEvent.touches[0].screenY);
		}
	},
	"touchend .screen" (event) {
		Template.instance().pinchDist = null;
		pointerInfo.release();
	},
	
	"mousedown .screen" (event) {
		pointerInfo.capture(Template.instance(), event, event.originalEvent.screenX, event.originalEvent.screenY);
	},
	"mouseup .screen" (event) {
		pointerInfo.release();
	},
	"mousemove .screen" (event) {
		if(event.buttons == 0) {
			pointerInfo.release();
		}
		else {
			pointerInfo.mouseMove(event.originalEvent.screenX, event.originalEvent.screenY);
		}
	},
	"mousewheel .screen" (event) {
		event.preventDefault();	
		var v = Template.instance().viewer;
		var zoomPane = $(".zoom-pane");
		var offset = zoomPane.offset();
		var scaleFactor = Math.pow(2, v.z);
		
		var x = (event.pageX - offset.left) / (zoomPane.width() * scaleFactor);
		var y = (event.pageY - offset.top) / (zoomPane.height() * scaleFactor);
		
		updateScale(v, -event.originalEvent.deltaY / 1000);
		
		scaleFactor = Math.pow(2, v.z);
		
		var newEventX = x * scaleFactor * zoomPane.width() + offset.left;
		var newEventY = y * scaleFactor * zoomPane.height() + offset.top;
		
		offset.left -= (newEventX - event.pageX);
		offset.top -= (newEventY - event.pageY);
						
		zoomPane.offset({left: offset.left, top: offset.top});
	}
});


Template.parameter.onCreated(function() {
	var instance = this;

	instance.onMove = function(x, y, diffX, diffY) {
		var v = this.data.controlPosition;
		
		if(Math.abs(diffX) > Math.abs(diffY))
			v += diffX / 300;
		else 
			v -= diffY / 300;
			
		v = Math.max(v, 0);
		v = Math.min(v, 1);
		this.data.controlPosition = v;
		Parameters.updateUndoable(this.data._id, { $set: { controlPosition: v }});
	}
});

Template.parameter.events({
	"mousedown .parameter" (event) {
		
		if(pointerInfo.capture(Template.instance(), event, event.originalEvent.screenX, event.originalEvent.screenY))
			undo.startParameterChange();
		
		$(".currentParameter").removeClass("currentParameter");
		$(Template.instance().find(".parameter")).addClass("currentParameter");
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
	},
	"mouseup .parameter" (event) {
		pointerInfo.release();
	},
	"touchstart .parameter" (event) {
		
		if(pointerInfo.capture(Template.instance(), event, event.originalEvent.screenX, event.originalEvent.screenY))
			undo.startParameterChange();
		
		$(".currentParameter").removeClass("currentParameter");
		$(Template.instance().find(".parameter")).addClass("currentParameter");
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
	},
	"touchend .parameter" (event) {
		pointerInfo.release();
	}
});

Template.parameterGroup.helpers({
	getGroupName: function () {
		var p = Parameters.findOne({group: this._id});
		
		if(p)
			return p.group_long;
		
		return "";
	},
	getColumns: function () {
		var ret = new Set();
		Parameters.find({group: this._id}).forEach(function(v) {
			if(v.ui_column.length > 0)
				ret.add(v.ui_column);
		});
		return Array.from(ret);
	}
});

Template.parameterColumn.helpers({
	getRows: function () {
		var id = Template.parentData(1)._id;
		var column = this[0];
		var query = {group: id, ui_column: column};
		var p = Parameters.find(query);
		return p;
	}
});

Template.parameter.helpers({
	isBigKnob: function () {
		return this.ui_representation == "Big Knob";
	},
	isVertSlider: function () {
		return this.ui_representation == "Vert. Slider";
	},
	isSmallKnob: function () {
		return this.ui_representation == "Small Knob";
	},
	isSmallHorizontalSlider: function () {
		return this.ui_representation == "Hor. Slider";
	},
	getParameterName: function () {
		var p = Parameters.findOne({_id: this._id});
		return p.name;
	}
});

Template.bigKnob.helpers({
	getParameterValue: function () {
		return parseFloat(this.controlPosition).toFixed(2);
	},
	getAngle: function() {
		var deadRange = 360 / 4;
		var usedRange = 360 - deadRange;
		var g = this.controlPosition * usedRange;
		var deg = 90 + deadRange / 2 + g;
		return deg;
	},
	getBackgroundDashArray: function() {
		var r = 40;
		var fullRange = 2 * Math.PI * r;
		var usedRange = fullRange * 0.75;
		var dead = fullRange - usedRange;
		var rest = fullRange - usedRange - dead / 2;
		var prop = "0," + (dead / 2) + "," + usedRange + ", " + rest;
		return prop;
	},
	getIndicatorDashArray: function() {
		var r = 40;
		var v = this.controlPosition;
		var inset = 1;
		var fullRange = 2 * Math.PI * r - 2 * inset;
		var usedRange = fullRange * 0.75;
		var dead = fullRange - usedRange + 2 * inset;
		var rest = fullRange - (usedRange * v) - dead / 2;
		var prop = "0," + (dead / 2) + "," + (usedRange * v) + ", " + rest;
		return prop;
	}
})

Template.verticalSlider.helpers({
	getParameterValue: function () {
		return parseFloat(this.controlPosition).toFixed(2);
	},
	getIndicatorTop: function() {
		return 99 - this.controlPosition * 98;
	},
	getIndicatorHeight: function() {
		return this.controlPosition * 98;
	}
})

Template.smallHorizontalSlider.helpers({
	getParameterValue: function () {
		return parseFloat(this.controlPosition).toFixed(2);
	},
	getIndicatorWidth: function() {
		return this.controlPosition * 98;
	}
})

Template.bigHorizontalSlider.helpers({
	getParameterValue: function () {
		return parseFloat(this.controlPosition).toFixed(2);
	},
	getIndicatorWidth: function() {
		return this.controlPosition * 98;
	}
})

Template.smallKnob.helpers({
	getParameterValue: function () {
		return parseFloat(this.controlPosition).toFixed(2);
	},
	getAngle: function() {
		var deadRange = 360 / 4;
		var usedRange = 360 - deadRange;
		var g = this.controlPosition * usedRange;
		var deg = 90 + deadRange / 2 + g;
		return deg;
	},
	getBackgroundDashArray: function() {
		var r = 32;
		var fullRange = 2 * Math.PI * r;
		var usedRange = fullRange * 0.75;
		var dead = fullRange - usedRange;
		var rest = fullRange - usedRange - dead / 2;
		var prop = "0," + (dead / 2) + "," + usedRange + ", " + rest;
		return prop;
	},
	getIndicatorDashArray: function() {
		var r = 32;
		var v = this.controlPosition;
		var inset = 1;
		var fullRange = 2 * Math.PI * r - 2 * inset;
		var usedRange = fullRange * 0.75;
		var dead = fullRange - usedRange + 2 * inset;
		var rest = fullRange - (usedRange * v) - dead / 2;
		var prop = "0," + (dead / 2) + "," + (usedRange * v) + ", " + rest;
		return prop;
	}
})

Template.bank.onCreated(function() {
	this.onMove = function(x, y, diffX, diffY) {
		this.data.pos.x += diffX  / currentScale;
		this.data.pos.y += diffY / currentScale;
		
		Banks.update(this.data._id, { $set: { 
			'pos.x': this.data.pos.x,
			'pos.y': this.data.pos.y
			}
		});
	}
});

Template.bank.events({
	"mousedown .bank > .title" (event) {
		pointerInfo.capture(Template.instance(), event, event.originalEvent.screenX, event.originalEvent.screenY);
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
	},
	"mouseup .bank > .title" (event) {
		pointerInfo.release();
	},
	"touchstart .bank > .title" (event) {
		pointerInfo.capture(Template.instance(), event, event.originalEvent.screenX, event.originalEvent.screenY);
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
	},
	"touchend .bank > .title" (event) {
		pointerInfo.release();
	}
});

Template.bank.helpers({
	getPresets: function () {
		return Presets.find({ bankId: this._id });
	},
	getLeft: function () {
		return this.pos.x;
	},
	getTop: function () {
		return this.pos.y;
	}
})

Template.preset.events({
	"change .preset > .title" (event) {
		event.preventDefault();
		var newTitle = event.target.value;
		Presets.update( this._id, { $set: { title: newTitle }});
	},
});

