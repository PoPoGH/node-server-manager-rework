#include maps\mp\_utility;
#include common_scripts\utility;
#include maps\mp\gametypes_zm\_hud_util;
#include maps\mp\zombies\_zm;
#include maps\mp\zombies\_zm_utility;
#include maps\mp\zombies\_zm_weapons;
#include maps\mp\zombies\_zm_stats;
#include maps\mp\gametypes_zm\_hud_message;
#include maps\mp\zombies\_zm_powerups;
#include maps\mp\zombies\_zm_perks;
#include maps\mp\zombies\_zm_audio;
#include maps\mp\zombies\_zm_score;

init()
{
	level thread onPlayerConnect();
	level thread roundLogger();

	level.match_logger_started = false;
}

onPlayerConnect()
{
	level endon("end_game");
	self endon("disconnect");

	for (;;)
	{
		level waittill("connected", player);

		// Log "player_joined" si match déjà en cours
		if (level.match_logger_started)
		{
			obj = [];
			obj["event"] = "player_joined";
			obj["timestamp"] = getTime();
			obj["player"] = [];
			obj["player"]["Name"] = player.name;
			obj["player"]["Guid"] = player getGuid();
			obj["player"]["Clientslot"] = player getEntityNumber();
			logPrint(json_encode(obj));
		}

		if (!level.match_logger_started) {
			level thread matchLogger();
			level.match_logger_started = true;
		}

		player thread statsUpdate();
		player thread downLogger();
		player thread reviveLogger();
		player thread playerLeaveLogger(); // <-- Ajouté ici
	}
}

playerLeaveLogger()
{
	self waittill("disconnect");

	obj = [];
	obj["event"] = "player_left";
	obj["timestamp"] = getTime();
	obj["player"] = [];
	obj["player"]["Name"] = self.name;
	obj["player"]["Guid"] = self.guid;
	obj["player"]["Clientslot"] = self getEntityNumber();
	logPrint(json_encode(obj));
}

arr2json(arr) {
	if (isObj(arr)) {
		return obj2json(arr);
	}
	keys = getArrayKeys(arr);
	string = "[";
	for (i = 0; i < keys.size; i++) {
		key = keys[i];
		if (!isObj(arr[key])) {
			if (isInt(arr[key])) {
				string += arr[key];
			} else {
				string += "\"" + arr[key] + "\"";
			}
		} else {
			string += obj2json(arr[key]);
		}
		if (i < keys.size - 1) {
			string += ", ";
		}
	}
	string += "]";
	return string;
}

isInt(var) {
	return int(var) == var;
}

json_encode(obj) {
	if (!IsArray(obj)) {
		return "\"" + obj + "\"\n";
	}
	if (!isObj(obj)) {
		return arr2json(obj) + "\n";
	}
	return obj2json(obj) + "\n";
}

obj2json(obj) {
	string = "{";
	keys = getArrayKeys(obj);
	if (!isDefined(keys)) {
		return "{ struct }";
	}
	for (i = 0; i < keys.size; i++) {
		key = keys[i];
		if (IsArray(obj[key])) {
			string += "\"" + key + "\": " + arr2json(obj[key]);
		} else {
			if (!isInt(obj[key])) {
				string += "\"" + key + "\": \"" + obj[key] + "\"";
			} else {
				string += "\"" + key + "\": " + obj[key];
			}
		}
		if (i < keys.size - 1) {
			string += ", ";
		}
	}
	string += "}";
	return string;
}

isObj(obj) {
	keys = getArrayKeys(obj);
	if (!isDefined(keys)) {
		return false;
	}
	for (i = 0; i < keys.size; i++) {
		if (int(keys[i]) == 0 && keys[i] != 0) {
			return true;
		}
	}
	return false;
}

playersToArr() {
	players = [];
	for (i = 0; i < level.players.size; i++) {
		players[i] = [];
		players[i]["Name"] = level.players[i].name;
		players[i]["Guid"] = level.players[i] getGuid();
		players[i]["Clientslot"] = level.players[i] getEntityNumber();
		players[i]["Stats"] = level.players[i] getPlayerStats();
	}
	return players;
}

statsUpdate() {
	self endon("disconnect");
	for (;;) {
		obj = [];
		obj["event"] = "update_stats";
		obj["player"] = [];
		obj["player"]["Name"] = self.name;
		obj["player"]["Guid"] = self.guid;
		obj["player"]["Clientslot"] = self getEntityNumber();
		obj["player"]["Stats"] = self getPlayerStats();
		logPrint(json_encode(obj));
		wait 60;
	}
}

getPlayerStats() {
	stats = [];
	stats["Kills"] = self.pers["kills"];
	stats["Downs"] = self.pers["downs"];
	stats["Revives"] = self.pers["revives"];
	stats["Headshots"] = self.pers["headshots"];
	stats["Score"] = self.score_total;
	stats["Round"] = level.round_number;
	return stats;
}

reviveLogger() {
	for (;;) {
		self waittill("player_revived");
		obj = [];
		obj["event"] = "player_revived";
		obj["player"] = [];
		obj["player"]["Name"] = self.name;
		obj["player"]["Guid"] = self.guid;
		obj["player"]["Clientslot"] = self getEntityNumber();
		obj["player"]["Stats"] = self getPlayerStats();
		logPrint(json_encode(obj));
	}
}

downLogger() {
	for (;;) {
		self waittill("player_downed");
		obj = [];
		obj["event"] = "player_downed";
		obj["player"] = [];
		obj["player"]["Name"] = self.name;
		obj["player"]["Guid"] = self.guid;
		obj["player"]["Clientslot"] = self getEntityNumber();
		obj["player"]["Stats"] = self getPlayerStats();
		logPrint(json_encode(obj));
	}
}

roundLogger() {
	for (;;) {
		level waittill("start_of_round");
		obj = [];
		obj["event"] = "round_start";
		obj["players"] = playersToArr();
		obj["round"] = level.round_number;
		logPrint(json_encode(obj));
	}
}

matchLogger()
{
	level.match_start_time = getTime();

	obj = [];
	obj["event"] = "match_start";
	obj["map"] = getDvar("mapname");
	obj["players"] = playersToArr();
	obj["timestamp"] = level.match_start_time;
	logPrint(json_encode(obj));

	// Stocker les joueurs encore en vie juste avant la fin
	level waittill("end_game");

	// Prendre un snapshot des joueurs actuels
	snapshot_players = playersToArr();

	end_time = getTime();
	duration = int((end_time - level.match_start_time) / 1000);

	obj = [];
	obj["event"] = "match_end";
	obj["map"] = getDvar("mapname");
	obj["players"] = snapshot_players; // Utiliser le snapshot ici
	obj["duration_seconds"] = duration;
	obj["timestamp"] = end_time;
	logPrint(json_encode(obj));
}

