"use strict";
const Sealious = require("sealious");

function extract_context(app, request){
	const config = app.ConfigManager.get_config()["www-server"];
	const cookie_name = config["session-cookie-name"];
	const anon_cookie_name = config["anonymous-cookie-name"];
	var d = new Date();
	var timestamp = d.getTime();
	var ip = request.info.remoteAddress;
	const session_id = request.state[cookie_name];
	const anon_session_is_new = request.state[anon_cookie_name] === undefined;
	
	let anonymous_user_id = null;
	let anonymous_session_id = null;

	let get_anonymous_data = null;

	if(anon_session_is_new){
		get_anonymous_data = app.run_action(
			new Sealious.SuperContext(),
			["collections", "anonymous-sessions"],
			"create",
			{"anonymous-session-id": null, "anonymous-user-id": null} //need to provide null here so the ids are genreated. Skipping the field would leave them "undefined"
		).then(function(anon_session){
			anonymous_session_id = anon_session.body["anonymous-session-id"];
			anonymous_user_id = anon_session.body["anonymous-user-id"];
		});
	}else{
		anonymous_session_id = request.state[anon_cookie_name];
		get_anonymous_data = app.run_action(
			new Sealious.SuperContext(),
			["collections", "anonymous-sessions"],
			"show",
			{filter: {"anonymous-session-id": anonymous_session_id}}
		).then(function(anon_sessions){
			anonymous_user_id = anon_sessions[0].body["anonymous-user-id"];
		});
	}

	return get_anonymous_data.then(function(){
		return app.run_action(
			new Sealious.SuperContext(),
			["collections", "sessions"],
			"show",
			{filter:{"session-id": session_id}}
		);
	})
	.then(function(results){
		if(results.length === 0){
			return new Sealious.Context(
				timestamp,
				ip,
				undefined,
				undefined,
				anonymous_session_id,
				anon_session_is_new,
				anonymous_user_id
			);
		}else{
			return new Sealious.Context(
				timestamp,
				ip,
				results[0].body.user,
				session_id,
				anonymous_session_id,
				anon_session_is_new,
				anonymous_user_id
			);
		}
	});
};

module.exports = extract_context;
