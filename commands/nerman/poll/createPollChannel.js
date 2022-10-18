const { CommandInteraction } = require('discord.js');
const { Modal, TextInputComponent, showModal } = require('discord-modals');
const Poll = require('../../../db/schemas/Poll');
const PollChannel = require('../../../db/schemas/PollChannel');
module.exports = {
   subCommand: 'nerman.create-poll-channel',
   /**
    *
    * @param {CommandInteraction} interaction
    */
   async execute(interaction) {
      console.log({ interaction });
      const {
         channelId,
         channel,
         guild,
         guild: {
            channels,
            roles: gRoles,
            roles: {
               cache: guildRoleCache,
               everyone: { id: everyoneId },
            },
         },
         user: { id: userId },
         member: {
            permissions,
            roles: { cache: roleCache },
         },
         memberPermissions,
      } = interaction;
      // console.timeEnd('destruct')'

      console.log(memberPermissions.has('MANAGE_GUILD'));
      console.log('commandInteraction -- create-poll', { channelId });
      // console.log('isTextBased', channel.isText());
      // console.log('isDMBased', channel.isDM());

      if (!memberPermissions.has('MANAGE_GUILD')) {
         return interaction.reply({
            content: 'Only guild managers have access to this.',
            ephemeral: true,
         });
      }

      if (!channel.isText())
         return interaction.reply({
            content:
               'Polling can only be configured within text based channels.',
            ephemeral: true,
         });

      // const configCheck = await PollChannel.countDocuments({
      //    channelId,
      // });
      const configCheck = await PollChannel.configExists(channelId);
      // console.log({ configCheck });

      if (configCheck)
         return interaction.reply({
            content: 'There already exists a configuration for this channel.',
            ephemeral: true,
         });

      // const channelConfigs = await PollChannel.find(
      //    {},
      //    'channelId channelName maxUserProposal'
      // );

      // Fetch all guild channels that are text channels and don't have an existing configuration
      // const guildChannels = await channels
      //    .fetch()
      //    .then(allChannels =>
      //       allChannels.filter(
      //          ({ type, id }) =>
      //             type === 'GUILD_TEXT' &&
      //             !channelConfigs.some(config => id === config.channelId)
      //       )
      //    )
      //    .catch(err => console.error(err));

      // console.log({ roles });
      // console.log({ roleCache });
      // console.log({ guild });
      // console.log({ channels });
      // console.log({ guildChannels });
      // console.log(channels.cache.get());
      // console.log({ interaction });
      // console.log({ channelConfigs });

      // if (!guildChannels) {
      //    return interaction.reply({
      //       content:
      //          'There are no available channels to create a new configuration for. Either there are no existing text channels, or they all have existing configurations. Existing configurations can be edited through context menu, but not overwritten by <Nerman create-poll-channel> command.',
      //       ephemeral: true,
      //    });
      // }

      // const channelOptions = guildChannels.map(({ id, name }) => ({
      //    label: name,
      //    value: id,
      // }));

      // console.log({ channelOptions });

      // const roleOptions = roleCache.map(({ id, name }) => ({
      //    label: name,
      //    value: id,
      // }));
      const roleOptions = await gRoles
         .fetch()
         .then(fetchedRoles =>
            fetchedRoles
               .filter(({ managed }) => !managed)
               .map(({ id, name }) => ({
                  label: name,
                  value: id,
               }))
         )
         .catch(err => console.error(err));
      // const roleOptions = roleCache
      //    .filter(({ id }) => id !== everyoneId)
      //    .map(({ id, name }) => ({ label: name, value: id }));

      // console.log({ roleOptions });

      if (!roleOptions.length) {
         return interaction.reply({
            content:
               'You must have at least one guild role in order to assign a voting role.',
            ephemeral: true,
         });
      }

      let placeholder = [];

      roleOptions.forEach(({ label }) => placeholder.push(label));

      placeholder = placeholder.join(', ');

      const modal = new Modal()
         .setCustomId('modal-create-poll-channel')
         .setTitle('Create Polling Channel');

      // const pollChannel = new SelectMenuComponent()
      //    .setCustomId('pollChannel')
      //    .setPlaceholder('Select Polling Channel')
      //    .addOptions(channelOptions)
      //    .setMinValues(1)
      //    .setMaxValues(1);

      // console.log({ pollChannel });

      console.log(roleOptions.length);

      const votingRoles = new TextInputComponent()
         .setCustomId('votingRoles')
         .setLabel('Choose Voting Roles')
         .setPlaceholder(placeholder)
         .setDefaultValue(placeholder)
         .setStyle('SHORT')
         .setMaxLength(100)
         .setRequired(true);
      //disabled until modals are supported
      // const votingRoles = new SelectMenuComponent()
      //    .setCustomId('votingRoles')
      //    .setPlaceholder('Allowed Voting Roles')
      //    .addOptions(roleOptions)
      //    .setMinValues(1)
      //    .setMaxValues(roleOptions.length);

      console.log({ votingRoles });

      // todo DURATION REGEX THEN PARSE- DURATION MAX OUT 999 hours
      const pollDuration = new TextInputComponent()
         .setCustomId('pollDuration')
         .setLabel('Poll Duration (hours)')
         .setPlaceholder('Eg) 60')
         .setStyle('SHORT')
         .setMaxLength(4)
         .setRequired(true);

      const maxProposals = new TextInputComponent()
         .setCustomId('maxProposals')
         .setLabel('Max Active Polls Per User')
         .setPlaceholder(
            'Choose maximum number of active polls allowed per user with voting role.'
         )
         .setStyle('SHORT')
         .setMaxLength(3)
         .setRequired(true);

      const pollQuorum = new TextInputComponent()
         .setCustomId('pollQuorum')
         .setLabel('Choose Quorum %')
         .setPlaceholder('0 - 100')
         .setStyle('SHORT')
         .setMaxLength(6)
         .setRequired(true);

      const pollChannelOptions = new TextInputComponent()
         .setCustomId('pollChannelOptions')
         .setLabel('Choose Channel Options (if any)')
         .setPlaceholder('anonymous-voting, live-results, vote-allowance')
         .setDefaultValue('anonymous-voting, live-results, vote-allowance')
         .setStyle('SHORT')
         .setMaxLength(50);

      // disabled until DJS add back support for SelectMenus in Modals
      // const pollChannelOptions = new SelectMenuComponent()
      //    .setCustomId('pollChannelOptions')
      //    .setPlaceholder('Select Channel Options (if any)')
      //    .addOptions(
      //       {
      //          label: 'Anonymous Voting',
      //          value: 'anonymous-voting',
      //          description:
      //             'Only participation is recorded, results are anonymous.',
      //       },
      //       {
      //          label: 'Live Results',
      //          value: 'live-results',
      //          description:
      //             'Display visual feed of results as polling occurs.',
      //       },
      //       {
      //          label: 'Vote Allowance',
      //          value: 'vote-allowance',
      //          description:
      //             'Enables custom vote allowance # on create-poll command.',
      //       }
      //    )
      //    .setMinValues(0)
      //    .setMaxValues(3);

      modal.addComponents(
         // pollChannel,
         votingRoles,
         pollDuration,
         maxProposals,
         pollQuorum,
         pollChannelOptions
      );

      await showModal(modal, {
         client: interaction.client,
         interaction: interaction,
      });
   },
};