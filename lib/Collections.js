Parameters = new Mongo.Collection('parameters');
Banks = new Mongo.Collection('banks');
Presets = new Mongo.Collection('presets');
Settings = new Mongo.Collection('settings');
ParameterUndo = new Mongo.Collection('parameter-undo');

var standardPermissions = {
	update: () => {
		return true
	},
	remove: () => {
		return true
	},
	insert: () => {
		return true
	}
};

Parameters.allow(standardPermissions);
Banks.allow(standardPermissions);
Presets.allow(standardPermissions);
Settings.allow(standardPermissions);
ParameterUndo.allow(standardPermissions);

publishCollections = function() {
	Meteor.publish('parameters', function() {
		return Parameters.find({});
	});
	
	Meteor.publish('banks', function() {
		return Banks.find({});
	});
	
	Meteor.publish('presets', function() {
		return Presets.find({});
	});
	
	Meteor.publish('settings', function() {
		return Settings.find({});
	});
	
	Meteor.publish('parameter-undo', function() {
		return ParameterUndo.find({});
	});
}

Parameters.updateUndoable = function(id, command) {
	undo.updateUndoable(Parameters, ParameterUndo, id, command);
}