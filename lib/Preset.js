class CIdentifyable {
	constructor() {
		var objectId = new Meteor.Collection.ObjectID();
		this._id = objectId._str;
	}
}

Identifyable = CIdentifyable;

class CPresetInfo {
	constructor() {
		this.title = "New Preset";
		this.createdAt = (new Date()).toISOString();
	}
}

PresetInfo = CPresetInfo;

class CParameter {
	constructor() {
		this.id = 0;
		this.controlPosition = 0.5;
	}
}

Parameter = CParameter;


class CModulationInfo {
	constructor() {
		this.source = 0;
		this.amount = 0.0;
	}
}

ModulationInfo = CModulationInfo;

class CModulateableParameter extends Parameter {
	constructor() {
		super();
		this.modulation = new ModulationInfo();
	}
}

ModulateableParameter = CModulateableParameter;

class CPreset extends Identifyable {
	constructor(bankId) {
		super();
		this.bankId = bankId;
		this.info = new PresetInfo();
		this.parameters = Parameters.find({}, { fields: {controlPosition: 1}}).fetch();
	}
}

Preset = CPreset;