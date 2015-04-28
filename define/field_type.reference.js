var Promise = require("bluebird");

/*
var Reference = function(declaration){
	this.validate_declaration(declaration);

	this.name = declaration.name;
	this.required = declaration.required===undefined? false : true;
	this.allowed_types = declaration.allowed_types || [];
}
*/

module.exports = function(field_type_reference){
	field_type_reference.prototype.validate_declaration = function(declaration){
		var required_declaration_fields = {
			"name": "string", 
			"allowed_types": "array"
		}
		for(var attribute_name in required_declaration_fields){
			if(declaration[attribute_name]===undefined){
				throw new Sealious.Errors.DeveloperError("Missing `" + attribute_name + "` attribute in reference declaration.");
			}
		}
		for(var i in declaration.allowed_types){
			var type_name = declaration.allowed_types[i];
			if(!Sealious.ChipManager.chip_exists("resource_type", type_name)){
				throw new Sealious.Errors.DeveloperError("Unknown allowed type in declaration of reference: " + type_name);
			}
		}
	}

	field_type_reference.prototype.isProperValue = function(value){
		return new Promise(function(resolve, reject){
			if(typeof value == "object"){
				//validate object's values as values for new resource
				var type = value.type;
				if(type===undefined){
					reject("Reference resource type undefined. `type` attribute should be set to one of these values: " + this.params.allowed_types.join(", ") + ".");
				}else if(this.params.allowed_types.indexOf(type)==-1){
					reject("Incorrect reference resource type: `" +  type + "`. Allowed resource types for this reference are:" + this.params.allowed_types.join(", ") + "."); 
				}else{
					var resource_type_object = Sealious.ChipManager.get_chip("resource_type", type);
					
					resource_type_object.validate_field_values(value.data)
						.then(resolve)
						.catch(function(error){
							if(error.is_sealious_error && error.data.invalid_fields==undefined){
								reject(error.status_message);
							}else{
								reject(error.data.invalid_fields);							
							}
						});
				}
			}else{
				//value is uid. Check if it is proper
				var supposed_resource_id = value;
				Sealious.Dispatcher.resources.get_by_id(supposed_resource_id)
				.then(function(resource){
					if(this.params.allowed_types.indexOf(resource.type)>=0){
						resolve(resource);
					}else{
						reject("Resource of id `" + supposed_resource_id + "` is not of allowed type. Allowed types are: [" + this.params.allowed_types.join(", ") +"]");
					}
				}.bind(this))
				.catch(function(error){
					if(error.type=="not_found"){
						reject(error.status_message);
					}else{
						reject(error);
					}
				}.bind(this));
			}
		}.bind(this));
	}

	field_type_reference.prototype.isProperValue.has_byproducts = true;

	field_type_reference.prototype.encode = function(value_in_code){
		//decide whether to create a new resource (if so, do create it). Resolve with id of referenced resource.
		return new Promise(function(resolve, reject){
			if(value_in_code instanceof Object){
				Sealious.Dispatcher.resources.create(value_in_code.type, value_in_code.data).then(function(resource){
					resolve(resource.id);
				})
			}else{
				//assuming the provided id already exists
				resolve(value_in_code);
			}			
		})
	}
}

//module.exports = Reference;