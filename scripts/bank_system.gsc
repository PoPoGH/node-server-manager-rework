#include maps/mp/_utility;
#include common_scripts/utility;
#include maps/mp/gametypes_zm/_hud_util;
#include maps/mp/zombies/_zm;
#include maps/mp/zombies/_zm_utility;
#include maps/mp/zombies/_zm_weapons;
#include maps/mp/zombies/_zm_stats;
#include maps/mp/gametypes_zm/_hud_message;
#include maps/mp/zombies/_zm_powerups;
#include maps/mp/zombies/_zm_perks;
#include maps/mp/zombies/_zm_audio;
#include maps/mp/zombies/_zm_score;

init()
{
	level thread playerBank();
	level thread onPlayerConnect();
}

onPlayerConnect()
{
	level endon( "end_game" );
    self endon( "disconnect" );
	for (;;)
	{
		level waittill( "connected", player );
		player thread setPlayerMoney();
		player thread endPlayerMoney();
		player thread endPlayerMoney2();
	}
}

endPlayerMoney() {
	self endon("disconnect");
	for (;;) {
		level waittill("end_game");
		setDvar(self getEntityNumber() + "_money", 0);
	}
}

endPlayerMoney2() {
	self endon("disconnect");
	for (;;) {
		level waittill("_zombie_game_over");
		setDvar(self getEntityNumber() + "_money", 0);
	}
}

setPlayerMoney() {
	level endon("end_game");
	self endon("disconnect");
	for (;;) {
		if (!isAlive(self)) {
			setDvar(self getEntityNumber() + "_money", 0);
		} else {
			setDvar(self getEntityNumber() + "_money", self.score);
		}
		wait 0.05;
	}
}

getPlayerByGuid(guid) {
	for (i = 0; i < level.players.size; i++) {
		if (isAlive(level.players[i]) && int(level.players[i] getGuid()) == int(guid)) {
			return level.players[i];
		} 
	}
	return false;
}

playerBank() {
	for (;;) {
		if (getDvar("bank_withdraw") != "") {
			withdraw = strTok(getDvar("bank_withdraw"), ";");
			setDvar("bank_withdraw", "");
			getPlayerByGuid(withdraw[0]).score += int(withdraw[1]);
			getPlayerByGuid(withdraw[0]) iPrintLn("Withdrew ^2$" + int(withdraw[1]) + "^7 from your bank account!");
		}
		if (getDvar("bank_deposit") != "") {
			deposit = strTok(getDvar("bank_deposit"), ";");
			setDvar("bank_deposit", "");
			getPlayerByGuid(deposit[0]).score -= int(deposit[1]);
			getPlayerByGuid(deposit[0]) iPrintLn("Deposited ^2$" + int(deposit[1]) + "^7 into your bank account!");
		}
		wait 0.05;
	}
}
