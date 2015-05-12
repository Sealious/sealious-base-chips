var sha1 = require("sha1");

var session_id_to_user_id = {};
//póki co hashe sesji sa trzymane tylko w RAMie. Być może trzeba będzie je trzymac w pliku (albo w plikach!) na dysku.

function generate_session_id() {
    var seed = Math.random().toString();
    var session_id = sha1(seed);
    return session_id;
}

function new_session(user_id) {
    var session_id = generate_session_id();
    session_id_to_user_id[session_id] = user_id;
    return session_id;
}

function kill_session(session_id) {
    Sealious.Logger.info("Killing session: ", session_id);
    delete session_id_to_user_id[session_id];
}

function get_user_id(session_id) {
    if (session_id_to_user_id[session_id]==undefined) {
        return false;        
    }else{
        return session_id_to_user_id[session_id];
    }
}

module.exports = function(www_server, dispatcher, dependencies){
    var http_channel = dependencies["channel.http"];

    www_server.default_configuration = {
        port: 80
    }

    www_server.server = http_channel.new_server();
    www_server.server.connection({port: www_server.configuration.port,  routes: { cors: true }})
    
    www_server.start = function(){
        www_server.server.start(function(err){
            Sealious.Logger.info('SERVER RUNNING: '+www_server.server.info.uri+"\n");
        })
    }

    www_server.get_context = function(request){
        var d = new Date();
        var timestamp = d.getTime();
        var ip = request.info.remoteAddress;
        var session_id = request.state.SealiousSession;
        return new Sealious.Context(timestamp, ip, session_id);
    }

    function custom_reply_function(original_reply_function, request_details, obj){
        var ret;
        if(obj==undefined){
            obj={};
        };
        if(obj.is_sealious_error){
            var res = Sealious.Response.fromError(obj);
            Sealious.Logger.error(request_details.method+" "+request_details.path+" failed - "+obj.status_message);
            ret = original_reply_function(res).code(obj.http_code);
        }else if(obj instanceof Error){
            Sealious.Logger.error(obj);
            var res = Selaious.Response.fromError(Sealious.Errors.Error("Internal server error"));
            ret = original_reply_function(res);
        }else{
            Sealious.Logger.info(request_details.method+" "+request_details.path+" - success!");
            ret = original_reply_function(obj);
        }
        return ret;
    }

    function process_request(old_request){
        var cookie_string = old_request.headers.cookie;
        if(cookie_string){
            var cookie_array = cookie_string.split(";");
            var new_state = cookie_array.map(function(cookie_entry){
                var obj = {};
                obj[cookie_entry.split("=")[0]]=cookie_entry.split("=")[1];
            });
            for(var i in new_state){
                old_request.state[i] = new_state[i] && new_state[i].trim();
            }            
        }
        return old_request;
    }

    www_server.route = function(){
        var original_handler = arguments[0].handler;
        if(original_handler && typeof original_handler=="function"){
            arguments[0].handler = function(request, reply){
                var request_details = {
                    method: request.method.toUpperCase(),
                    path: request.path
                };
                var new_reply = custom_reply_function.bind(custom_reply_function, reply, request_details);
                var new_request = process_request(request);
                original_handler(new_request, new_reply);
            }
        }
        www_server.server.route.apply(this.server, arguments);
    }


    www_server.static_route = function(path, url) {        
        this.server.route({ 
            method: 'GET',
            path: url + '/{param*}',
            handler: {
                directory: {
                    path: path
                }
            }
        });
    }

    www_server.new_session = new_session;
    www_server.kill_session = kill_session;
    www_server.get_user_id = get_user_id;
}