const Discord = require('discord.js');

//
//SQL
const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('./currencybot.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('GET - Connected to CurrencyBot database');
});


var methods = {
	
	//
	//Checks if user exists or not
	AccountCheck: async function(message) {
		var _account = 33/*message.author.id*/
		var _exists = false
		console.log(_account)
		let sql = 'SELECT 1 FROM Accounts WHERE account_id=' + _account
		db.each(sql, [], (err, rows) => {
			if (rows !== null)
				_exists = true
		});
	
		await new Promise(resolve => setTimeout(resolve, 10));
		console.log(_exists)
		return (_exists)
	}
	
}

exports.data = methods