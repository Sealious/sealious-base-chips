var Promise = require("bluebird");

module.exports = function(field_type_date) {

    field_type_date.prototype.isProperValue = function(date) {
        return new Promise(function(resolve, reject) {

            var date_in_string = date.toString();

            var regex = /^[1-2][0-9]{3}-([1-9]|0[1-9]|1[0-2])-([1-9]|0[1-9]|1[0-9]|2[0-9]|30|31)$/; //granulation_per_day

	            if (regex.test(date_in_string) === false || Date.parse(date_in_string) === NaN) {
	                reject("`"+date+"`" + " is not date calendar format. Expected value standard IS0 8601 (YYYY-MM-DD) for date without time. If you would like to use `date with time` please set field_type_datetime instead field_type_date in main.js");
	            } else {
	                resolve();
	            }
        })
    }

    field_type_date.prototype.encode = function(date) {
        return new Promise(function(resolve, reject) {
        	var date_in_string = date.toString();
            resolve(Date.parse(date_in_string));
        })
    }
}
