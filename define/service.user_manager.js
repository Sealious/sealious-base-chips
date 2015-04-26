var Promise = require("bluebird");


module.exports = function(user_manager, dispatcher){

	user_manager.create_user = function(dispatcher, username, password){
		var user_data;
		return dispatcher.services.user_manager.user_exists(username, dispatcher)
		.then(function(user_exists){	
			if (!user_exists){
				Sealious.Logger.info("User " + username +"has been created");
				return dispatcher.resources.create("user", {username: username, password:password});
			}else{
				throw new Sealious.Errors.ValueExists("Username `" + username + "` is already taken.");
			}
		})
	}

	user_manager.user_exists = function(dispatcher, username){
		return new Promise(function(resolve, reject){
			dispatcher.resources.find({username: username}, "user")
			.then(function(matched_documents){
				resolve(matched_documents.length===1);
			});			
		})
	}

	user_manager.password_match = function(dispatcher, username, password){
		return new Promise(function(resolve, reject){
			if (!username && !password) {
				var err = new Sealious.Errors.InvalidCredentials("Missing username and password!");
				reject(err);
			} else if (!password) {
				var err = new Sealious.Errors.InvalidCredentials("Missing password!");
				reject(err);
			} else if (!username) {
				var err = new Sealious.Errors.InvalidCredentials("Missing username!");
				reject(err);
			} else {
				username = username.toString();
				password = password.toString();
				var query = {type: "user", body: {username: username, password: password}};
				dispatcher.datastore.find("resources", query)
				.then(function(result){
					if(result[0]){
						resolve(result[0].sealious_id);
					}else{
						var err = new Sealious.Errors.InvalidCredentials("Wrong username or password!");
						reject(err);
					}
				})
			}			
		})
	}

	user_manager.get_all_users = function(dispatcher){
		return dispatcher.datastore.find("resources", {type: "user"});
	}

	user_manager.get_user_data = function(dispatcher, user_resource_id){
		var user_resource_id = parseInt(user_resource_id);
		try{
			var ret = dispatcher.resources.get_by_id(user_resource_id);						
		}catch(err){
			throw err;
		}
		return ret;
	}

	user_manager.update_user_data = function(dispatcher, user_id, new_user_data){
		return dispatcher.resources.update_resource(user_id, new_user_data);
	}

	user_manager.delete_user = function(dispatcher, user_id){
 		return new Promise(function(resolve, reject){ 			
 			dispatcher.datastore.delete("resources", {sealious_id: user_id})
 			.then(function(data){
				resolve(data);
			}).catch(function(e){
				reject(e);
			});			
		});
	}

}
