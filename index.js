require('dotenv').config();
const fs = require('fs');

const { Client, Collection, Intents } = require('discord.js');
const token = process.env.DISCORD_TOKEN;

const Logger = require('./helpers/logger');

const client = new Client({
   intents: [
      Intents.FLAGS.GUILDS,
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.GUILD_MEMBERS,
      Intents.FLAGS.GUILD_PRESENCES,
      Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
      Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
      Intents.FLAGS.GUILD_WEBHOOKS,
   ],
});
const discordModals = require('discord-modals');
discordModals(client);

['events', 'commands', 'buttons'].forEach(handler =>
   require(`./handlers/${handler}.js`)(client, (reload = false))
);

client.on('shardError', error => {
   Logger.error('index.js: A websocket connection encountered an error.', {
      error: error,
   });
});

process.on('unhandledRejection', error => {
   Logger.error('index.js: Unhandled promise rejection.', {
      error: error,
   });
});

process.on('warning', console.warn);

// Login to Discord with your client's token
client.login(token);
