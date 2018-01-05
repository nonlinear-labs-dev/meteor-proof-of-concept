import { Meteor } from 'meteor/meteor';

fs = require("fs");

function initDatabase() {
	Parameters.remove({});
		
	fs.readFile(process.env.PWD + '/server/ParameterList.csv', 'utf8', Meteor.bindEnvironment(function (err,data) {
		data = data.replace(/\"(.*?)\n(.*?)\"/ig, function(match, p1, p2) {
			return "\"" + p1 + " " + p2 + "\"";			
		});
		
		var lastFoundGroupId = "";
		var lastFoundGroup = "";
		
		CSV.parse(data, {
			complete: Meteor.bindEnvironment(function(results) {
								
				results.data.forEach(function(result) {
					
					if(result[3].length > 0) {
						lastFoundGroup = result[3];
						lastFoundGroupId = result[3].toLowerCase();
						lastFoundGroupId = lastFoundGroupId.replace(/ /g, "_");
						lastFoundGroupId = lastFoundGroupId.replace(/\(/g, "");
						lastFoundGroupId = lastFoundGroupId.replace(/\)/g, "");
					}
					
					if(result[2] == 1 || result[2] == 2) {
						var id = "param_" + result[0];
						var position = result[10].split(".");
						
						var param = {
								_id: id,
								controlPosition: 0.5,
								size: result[2],
								group: lastFoundGroupId,
								group_long: lastFoundGroup,
								name: result[4],
								ui_representation: result[9],
								ui_column: position[0],
								ui_row: position[1],
						}
						
						if(!Parameters.findOne({_id: id}))
							Parameters.insert(param);
					}
				});
				
				Banks.remove({});
				Presets.remove({});
				
				for(i = 0; i < 10; i++) {
					var bankId = new Meteor.Collection.ObjectID();
					var bank = {
							_id: bankId._str,
							title: "New Bank",
							pos: {
								x: 20 + i * 10,
								y: 20 + i * 10
							}
					}
					
					Banks.insert(bank);
					
					for(j = 0; j < 10; j++) {
						var preset = new Preset(bankId._str);
						Presets.insert(preset);
					}
				}
				
				ParameterUndo.remove({});
			})
		});
	}));	
}

Meteor.startup(() => {
	//if (Parameters.find().count() === 0) 
		initDatabase();
		publishCollections();
});

Meteor.methods({
	'importCSV' () {
		initDatabase();
	},
	'fetchGroups' () {
		return Parameters.aggregate([ { $group: { _id: "$group" }}]);
	}
});


