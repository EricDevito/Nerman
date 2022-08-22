const {
   Modal,
   TextInputComponent,
   SelectMenuComponent,
   showModal,
} = require('discord-modals');
const { ButtonInteraction } = require('discord.js');
const Poll = require('../db/schemas/Poll');
const PollChannel = require('../db/schemas/PollChannel');

module.exports = {
   id: 'vote',
   /**
    *
    * @param {ButtonInteraction} interaction
    */
   async execute(interaction) {
      if (!interaction.isButton()) {
         console.log('VOTE BUTTON -- isButton: false', { interaction });
         return;
      }
      console.log(
         'VOTE BUTTON -- isButton: true -- interaction',
         interaction.isButton()
      );

      const {
         channelId,
         message: { id: messageId },
         user: { id: userId },
         member: {
            roles: { cache: roleCache },
         },
      } = interaction;

      const { allowedRoles } = await PollChannel.findOne(
         { channelId },
         'allowedRoles'
      ).exec();

      console.log({ allowedRoles });

      if (!roleCache.hasAny(...allowedRoles)) {
         console.log('USER DOES NOT HAS ROLE');
         return interaction.reply({
            content: 'You do not have the role, dummy',
            ephemeral: true,
         });
      }

      const attachedPoll = await Poll.findOne({ messageId })
         .populate([{ path: 'config' }])
         .exec();

      if (!attachedPoll.allowedUsers.has(userId)) {
         return interaction.reply({
            content: 'You are not eligible to participate in this poll, square',
            ephemeral: true,
         });
      }

      // disabled disabled for testing
      // if (attachedPoll.allowedUsers.get(userId) === true) {
      //    return interaction.reply({
      //       content: 'You have already cast your vote, you political glutton',
      //       ephemeral: true,
      //    });
      // }

      const optionsString = attachedPoll.pollData.choices.join(', ');
      // disabled until DJS SELECT MENU Modal supported
      // const optionsMap = attachedPoll.pollData.choices.map(choice => ({
      //    label: choice,
      //    value: choice,
      // }));

      // console.log({ attachedPoll });

      const modal = new Modal().setCustomId('vote-modal').setTitle('Vote');

      const selectOptions = new TextInputComponent()
         .setCustomId('votingSelect')
         .setLabel(`Type ${attachedPoll.voteAllowance} Choice(s)`)
         .setPlaceholder(optionsString)
         .setDefaultValue(optionsString)
         .setStyle('LONG');

      // disabled until DJS supports SELECT MENU Modal
      // const selectOptions = new SelectMenuComponent()
      //    .setCustomId('votingSelect')
      //    .setPlaceholder('Make your selection(s)')
      //    .addOptions(optionsMap)
      //    .setMinValues(attachedPoll.config.voteAllowance)
      //    .setMaxValues(attachedPoll.config.voteAllowance);

      const reason = new TextInputComponent()
         .setCustomId('voteReason')
         .setLabel('Reason')
         .setPlaceholder('Real talk, which Spice Girl is the cutest?')
         .setStyle('LONG');

      modal.addComponents(selectOptions, reason);

      console.log(modal.components);
      console.log(modal.components[0]);
      console.log(modal.components[0].components[0]);
      // console.log({modal)

      try {
         await showModal(modal, {
            client: interaction.client,
            interaction: interaction,
         });
      } catch (error) {
         console.error(error);
      }

      console.log({ modal });
   },
};