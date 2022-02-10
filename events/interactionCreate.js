module.exports = {
   name: 'interactionCreate',
   async execute(interaction) {
      if (!interaction.isCommand()) return;

      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) return;

      try {
         await command.execute(interaction);
      } catch (error) {
         console.error(error);

         return interaction.reply({
            content:
               error.message ||
               'There was an error while executing this command!',
            ephemeral: true,
         });
      }
   },
};