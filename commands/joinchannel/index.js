module.exports = {
	Name: "joinchannel",
	Aliases: null,
	Author: "supinic",
	Cooldown: 0,
	Description: "Adds a new channel to database, sets its tables and events, and joins it. Only applicable for Twitch channels (for now, at least).",
	Flags: ["mention","pipe","system","whitelist"],
	Params: null,
	Whitelist_Response: null,
	Static_Data: null,
	Code: (async function joinChannel (context, channel, mode) {
		if (context.platform.Name !== "twitch") {
			return {
				success: false,
				reply: "This command is not available outside of Twitch!"
			};
		}
		else if (!channel.includes("#")) {
			return { 
				success: false,
				reply: "Channels must be denominated with #, as a safety measure!" 
			};
		}
		else if (mode && mode !== "Read") {
			return { 
				success: false,
				reply: `Only additional mode available is "Read"!`
			};
		}
		
		channel = channel.replace("#", "").toLowerCase();
		const existing = sb.Channel.get(channel);
		if (existing) {
			return {
				success: false,
				reply: "This channel already exists in the database, with mode = " + existing.Mode + "!"
			};
		}
		const { controller } = sb.Platform.get("twitch");
		const channelID = await controller.getUserID(channel);
		if (!channelID) {
			return {
				success: false,
				reply: "Could not find provided channel on Twitch!"
			};
		}
	
		const newChannel = await sb.Channel.add(channel, context.platform, mode ?? "Write", channelID);
		await context.platform.client.join(channel);
	
		return { reply: "Success." };
	}),
	Dynamic_Description: null
};