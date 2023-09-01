const { CommandInteraction } = require('discord.js');
const { inlineCode } = require('@discordjs/builders');

const FeedConfig = require('../../../db/schemas/FeedConfig');
const Logger = require('../../../helpers/logger');
const { authorizeInteraction } = require('../../../helpers/authorization');
const events = require('../../../utils/feedEvents');

module.exports = {
   subCommand: 'nerman.feeds.remove',
   /**
    * @param {CommandInteraction} interaction
    */
   async execute(interaction) {
      Logger.info(
         'commands/slashCommands/feeds/remove.js: Removing new event configuration.',
         {
            userId: interaction.user.id,
            guildId: interaction.guildId,
            channelId: interaction.channelId,
         },
      );

      await authorizeInteraction(interaction, 2);

      const channel =
         interaction.options.getChannel('channel') ?? interaction.channel;
      const event = interaction.options.getString('event');

      if (!channel || !event) {
         throw new Error('The channel and event were not supplied.');
      }

      await removeFeed(interaction, channel.id, event);

      Logger.info(
         'commands/slashCommands/feeds/remove.js: Finished removing event configuration.',
         {
            userId: interaction.user.id,
            guildId: interaction.guildId,
            channelId: interaction.channelId,
         },
      );
   },
};

/**
 * @param {CommandInteraction} interaction
 * @param {string} channelId
 * @param {string} event
 */
async function removeFeed(interaction, channelId, event) {
   let config;
   try {
      config = await FeedConfig.findOneAndDelete({
         guildId: interaction.guildId,
         channelId: channelId,
         eventName: event,
         isDeleted: {
            $ne: true,
         },
      }).exec();
   } catch (error) {
      Logger.error(
         'commands/slashCommands/feeds/remove.js: Unable to remove the configuration.',
         {
            error: error,
         },
      );
      throw new Error(
         'Unable to remove notification configuration due to a database issue.',
      );
   }

   const eventName = events.get(event);

   if (config) {
      await interaction.reply({
         ephemeral: true,
         content: `You have successfully removed the ${inlineCode(
            eventName,
         )} event from channel ${inlineCode(channelId)}.`,
      });
   } else {
      await interaction.reply({
         ephemeral: true,
         content: `${inlineCode(
            eventName,
         )} was not registered to channel ${inlineCode(
            channelId,
         )}. Nothing was removed.`,
      });
   }
}
