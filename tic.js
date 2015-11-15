function newGame(db, slack, user1, user2, channel) {
	var cursor = db.collection('games').find({"user1": user1, "user2": user2});
	cursor.toArray(function(err, items) {
		if (items.length == 0) {
			db.collection('games').insertOne({
				"user1": user1,
				"user2": user2,
				"user1Score": 0,
				"user2Score": 0,
				"inGame": true,
				"type": "tic",
				"turn": user1,
				"board": [[0, 0, 0],
						  [0, 0, 0],
						  [0, 0, 0]]
			});
		}
		else {
			db.collection('games').updateOne(
				{"user1": user1, "user2": user2},
				{
					$set: {
						"inGame": true,
						"type": "tic",
						"turn": user1,
						"board": [[0, 0, 0],
							      [0, 0, 0],
							      [0, 0, 0]]
					}
				});
		}
	});
	printBoard(channel, [[0, 0, 0], [0, 0, 0], [0, 0, 0]])
	var name = slack.getUserByID(user1).name;
	channel.send(name + "'s move, column first then row");
}

function move(db, slack, user1, user2, channel, sender, text) {
	if (text.length != 2) {
		return null;
	}

	if (['a', 'b', 'c'].indexOf(text[0]) == -1) {
		return;
	}

	if (['1', '2', '3'].indexOf(text[1]) == -1) {
		return;
	}

	var cursor = db.collection('games').find({"user1": user1, "user2": user2});
	cursor.toArray(function(err, items) {
		if (items.length == 0) {
			return;
		}
		else {
			var game = items[0];
			if (!game.inGame) {
				return;
			}
			if (game.turn != sender) {
				return;
			}

			var board = game.board;
			if (board[['1', '2', '3'].indexOf(text[1])][['a', 'b', 'c'].indexOf(text[0])] != 0) {
				return;
			}

			if (sender == user1) {
				board[['1', '2', '3'].indexOf(text[1])][['a', 'b', 'c'].indexOf(text[0])] = 'X';
			}
			else {
				board[['1', '2', '3'].indexOf(text[1])][['a', 'b', 'c'].indexOf(text[0])] = 'O';
			}

			if (game.turn == user1) {				
				db.collection('games').updateOne(
					{"user1": user1, "user2": user2},
					{ 
						$set: {
							"inGame": true,
							"turn": user2,
							"board": board
						}
					});
			}
			else {				
				db.collection('games').updateOne(
					{"user1": user1, "user2": user2},
					{
						$set: {
							"inGame": true,
							"turn": user1,
							"board": board
						}
					});
			}

			printBoard(channel, board);
			if (!checkWin(slack, db, channel, user1, user2, board)) {
				var name = "";
				if (game.turn == user1) {
					name = slack.getUserByID(user2).name;
				}
				else {
					name = slack.getUserByID(user1).name;
				}
				channel.send(name + "'s move, column first then row");
			}
		}
	});
}

function checkWin(slack, db, channel, user1, user2, board) {
	var didWin = false;
	var wasOne = true;
	var full = true;

	for (var r = 0; r < 3; r++) {
		for (var c = 0; c < 3; c++) {
			full = full && board[r][c] != 0;
		}
	}

	if (full) {
		db.collection('games').updateOne(
				{"user1": user1, "user2": user2},
				{
					$set: {
						"inGame": false
					}
				});
		channel.send("Tie game!");
		return true;
	}

	for (var r = 0; r < 3; r++) {
		if (board[r][0] !== 0 &&board[r][0] === board[r][1] && board[r][1] === board[r][2]) {
			didWin = true;
			if (board[r][0] == 'X') {
				var cursor = db.collection('games').find({"user1": user1, "user2": user2});
				cursor.toArray(function(err, items) {
					if (items.length == 0) {
						return didWin;
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
			else {
				wasOne = false;
				var cursor = db.collection('games').find({"user1": user1, "user2": user2});
				cursor.toArray(function(err, items) {
					if (items.length == 0) {
						return didWin;
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
		}
	}

	for (var c = 0; c < 3; c++) {
		if (board[0][c] !== 0 && board[0][c] === board[1][c] && board[1][c] === board[2][c]) {
			didWin = true;
			if (board[0][c] == 'X') {
				var cursor = db.collection('games').find({"user1": user1, "user2": user2});
				cursor.toArray(function(err, items) {
					if (items.length == 0) {
						return didWin;
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
			else {
				wasOne = false;
				var cursor = db.collection('games').find({"user1": user1, "user2": user2});
				cursor.toArray(function(err, items) {
					if (items.length == 0) {
						return didWin;
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
		}
	}

	if (board[0][0] !== 0 && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
		didWin = true;
		if (board[0][0] == 'X') {
			var cursor = db.collection('games').find({"user1": user1, "user2": user2});
			cursor.toArray(function(err, items) {
				if (items.length == 0) {
					return didWin;
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
		else {
			wasOne = false;
			var cursor = db.collection('games').find({"user1": user1, "user2": user2});
			cursor.toArray(function(err, items) {
				if (items.length == 0) {
					return didWin;
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
	}

	if (board[0][2] !== 0 && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
		didWin = true;
		if (board[0][2] == 'X') {
			var cursor = db.collection('games').find({"user1": user1, "user2": user2});
			cursor.toArray(function(err, items) {
				if (items.length == 0) {
					return didWin;
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
		else {
			wasOne = false;
			var cursor = db.collection('games').find({"user1": user1, "user2": user2});
			cursor.toArray(function(err, items) {
				if (items.length == 0) {
					return didWin;
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
	}

	if (didWin) {
		if (wasOne) {
			channel.send("Game over! " + slack.getUserByID(user1).name + " won!");
		}
		else {
			channel.send("Game over! " + slack.getUserByID(user2).name + " won!");
		}
	}

	return didWin;
}

function curr(db, slack, user1, user2, channel) {
	var cursor = db.collection('games').find({"user1": user1, "user2": user2});
	cursor.toArray(function(err, items) {
		if (items.length == 0) {
			channel.send("No game found");
		}
		else {
			if (!items[0].inGame) {
				channel.send("No game in progress");
				return;
			}
			printBoard(channel, items[0].board);
			var name = "";
			var game = items[0];
			if (game.turn == user2) {
				name = slack.getUserByID(user2).name;
			}
			else {
				name = slack.getUserByID(user1).name;
			}
			channel.send(name + "'s move, column first then row");

		}
	});
}

function printBoard(channel, board) {
	var response = "~		a		 		b		 		c 		\n";
	for(var r = 3; r > 0; r--) {
		response += r;
		for (var i = 0; i < board.length; i++) {
			if (i > 0) {
				response += "|";
			}
			response += "		";
			if (board[r-1][i] === 0) {
				response += " ";
			}
			else {
				response += board[r-1][i];
			}	
			response += "		";
		};
		response += "\n";
		if (r != 1) {
			response += "-	--------------------------------\n";
		}
	}
	channel.send(response);
}

module.exports = {
	newGame: newGame,
	move: move,
	curr: curr
};