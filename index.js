Slack = require('slack-client');
MongoClient = require('mongodb').MongoClient;

tic = require('./tic');

slackToken = 'BOT-INTEGRATION-KEY';
autoReconnect = true;
autoMark = true;

slack = new Slack(slackToken, autoReconnect, autoMark);

mongoUrl = 'mongodb://localhost:27017/slackgames';
db = null;
MongoClient.connect(mongoUrl, function(err, dbTemp) {
	if (err == null) {
		db = dbTemp;
	}
	console.log("Connected to database.");
});


slack.on('open', function() {
	console.log("Connected to " + slack.team.name + " as @" + slack.self.name); 
});

slack.on('message', function(message) {
	var channel = slack.getChannelGroupOrDMByID(message.channel);
	if (!channel.is_im && !channel.is_mpim) {
		return;
	}

	var command = message.text.toLowerCase();
	var response = "";
	if (channel.is_im || channel.members.length > 3) {
		switch(command) {
			case 'help':
				response = help();
				break;
			case 'games':
				response = games().join(", ");
				break;
			default:
				response = "Some commands only work in a group DM with 2 memebrs and the bot"
				break;
		}
	}
	else {
		var user1 = null;
		var user2 = null;
		for(var i in channel.members) {
			if (channel.members[i] !== slack.self.id) {
				if (user1 === null) {
					user1 = channel.members[i];
				}
				else {
					user2 = channel.members[i];
				}
			}
		}

		if (user1.localeCompare(user2) > 0) {
			var temp = user1;
			user1 = user2;
			user2 = temp;
		}

		switch(command) {
			case 'help':
				response = help();
				break;
			case 'games':
				response = games().join(", ");
				break;
			case 'score':
				printScores(channel);
				break;
			case 'clear':
				clearGame(db, user1, user2);
				break;
			case 'end':
				endGame(db, user1, user2, message.user);
				break;
			case 'board':
				tic.curr(db, slack, user1, user2, channel);
				break;
		}
		if (command.indexOf("start ") == 0) {
			var game = command.split(" ")[1];
			switch(game) {
				case 'tic-tac-toe':
					tic.newGame(db, slack, user1, user2, channel);
					break;
				case 'ttt':
					tic.newGame(db, slack, user1, user2, channel);
					break;
				default:
					break;
			}
		}

		var cursor = db.collection('games').find({"user1": user1, "user2": user2});
		cursor.toArray(function(err, items) {
			if (items.length == 0) {
				return;
			}
			else {
				var doc = items[0];
				switch(doc.type) {
					case 'tic':
						tic.move(db, slack, user1, user2, channel, message.user, command);
						break;
					default:
						break;
				}
			}
		});
	}

	if (response !== "") {
		channel.send(response);
	}
});

slack.on('error', function(err) {
	db.close();
	console.error("Error", err);
});

function endGame(db, user1, user2, sender) {
	if (user1 === sender) {		
		var cursor = db.collection('games').find({"user1": user1, "user2": user2});
		cursor.toArray(function(err, items) {
			if (items.length == 0 || !items[0].inGame) {
				return;
			}
			else {
				db.collection('games').updateOne(
					{"user1": user1, "user2": user2},
					{
						$set: {
							"inGame": false,									
							"user2Score": items[0].user2Score + 1
						}
					});
			}
		});
	}
	else {		
		var cursor = db.collection('games').find({"user1": user1, "user2": user2});
		cursor.toArray(function(err, items) {
			if (items.length == 0 || !items[0].inGame) {
				return;
			}
			else {
				db.collection('games').updateOne(
					{"user1": user1, "user2": user2},
					{
						$set: {
							"inGame": false,									
							"user1Score": items[0].user1Score + 1
						}
					});
			}
		});
	}
}

function printScores(channel) {
	var user1 = null;
	var user2 = null;
	for(var i in channel.members) {
		if (channel.members[i] !== slack.self.id) {
			if (user1 === null) {
				user1 = channel.members[i];
			}
			else {
				user2 = channel.members[i];
			}
		}
	}

	if (user1.localeCompare(user2) > 0) {
		var temp = user1;
		user1 = user2;
		user2 = temp;
	}

	var cursor = db.collection('games').find({"user1": user1, "user2": user2});
	cursor.toArray(function(err, items) {
		if (items.length == 0) {
			channel.send(slack.getUserByID(user1).name + ": 0\n" + 
				slack.getUserByID(user2).name + ": 0");
		}
		else {
			channel.send(slack.getUserByID(user1).name + ": " + items[0].user1Score +"\n" + 
				slack.getUserByID(user2).name + ": " + items[0].user2Score);
		}
	});
}

function games() {
	return ['tic-tac-toe', 'chess', 'checkers'];
}

function clearGame(db, user1, user2) {
	db.collection('games').updateOne(
		{"user1": user1, "user2": user2},
		{
			$set: {
				"inGame": false,
				"user1Score": 0,								
				"user2Score": 0
			}
		});
}

function help() {
	return "help - This dialog\n" +
		   "score - See the win count of both players\n" +
		   "start [game] - Clears current game and starts a new game of selected type\n" +
		   "games - Lists the types of games available\n" +
		   "board - Show current board state\n" +
		   "clear - Clears wins of both players\n" +
		   "end - Ends current game and counts as a loss for you";
}

process.on('exit', function (){
	db.close();
	process.exit()
});

process.on('SIGINT', function (){
	db.close();
	process.exit()
});

process.on('uncaughtException', function (){
	db.close();
	process.exit()
});

slack.login()