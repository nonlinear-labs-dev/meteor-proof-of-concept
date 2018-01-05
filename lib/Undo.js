jsondiffpatch = require("jsondiffpatch");

class Undo {
	constructor() {
		this.undoTip = null;
	}
	
	updateUndoable(collection, undoCollection, id, command) {
		var oldVal = collection.findOne(id);
		collection.update(id, command);
		var newVal = collection.findOne(id);
		var patch = jsondiffpatch.diff(oldVal, newVal);
		
		if(patch) {
			var record = {
					parent: this.undoTip,
					delta: patch,
					doc: id
			}
			this.undoTip = undoCollection.insert(record);
		}
	}
	
	startParameterChange() {
		
	}
	
	undo() {
		console.log("undo, tip=" + this.undoTip);
		
		if(this.undoTip) {
			var currentRecord = ParameterUndo.findOne(this.undoTip);
			var entry = Parameters.findOne(currentRecord.doc);
			var reversedPatch = jsondiffpatch.reverse(currentRecord.delta);
			var changed = jsondiffpatch.patch(entry, reversedPatch);
			Parameters.update(currentRecord.doc, {$set: changed});
			this.undoTip = currentRecord.parent;
		}			
	} 
	
	redo() {
		console.log("redo, tip=" + this.undoTip);
		
		if(this.undoTip) {
			var currentRecord = ParameterUndo.findOne({parent: this.undoTip});
			
			if(currentRecord) {
				var entry = Parameters.findOne(currentRecord.doc);
				var changed = jsondiffpatch.patch(entry, currentRecord.delta);
				Parameters.update(currentRecord.doc, {$set: changed});
				this.undoTip = currentRecord._id;
			}
		}			
	} 
};

undo = new Undo(); 