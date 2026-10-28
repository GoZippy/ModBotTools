import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, Events, GatewayIntentBits,
  EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder, escapeMarkdown,
  type ButtonInteraction, type ChatInputCommandInteraction, type Message
} from 'discord.js';
import type { Config } from './config.js';
import { CaseStore } from './core/case-store.js';
import { canConfigure, canReview, canViewConfig, type Actor, type Permission } from './core/access.js';
import { actIfCurrent, stillCurrent } from './core/event-version.js';
import { decide } from './core/policy.js';
import { canApproveCase } from './core/review-readiness.js';
import { preview } from './core/redact.js';
import { selectRoute, type RouteSelection, type Trigger } from './core/routing.js';
import type { Classifier, ModerationEvent, ReviewCase, Surface } from './core/types.js';

function buttons(id: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`review:approve:${id}`).setLabel('Approve').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`review:dismiss:${id}`).setLabel('Dismiss').setStyle(ButtonStyle.Secondary)
  );
}

function surfaceOf(message: Message): Surface {
  if (message.channel.isThread()) return 'thread';
  if (message.channel.isVoiceBased()) return 'voice_text';
  return 'text';
}

function normalized(message: Message): ModerationEvent {
  return {
    spec: 'modbot.event.v1',
    id: `${message.id}:${message.editedTimestamp ?? 0}`, guildId: message.guildId!,
    channelId: message.channelId, authorId: message.author.id, content: message.content,
    surface: surfaceOf(message), mentionCount: message.mentions.users.size + message.mentions.roles.size,
    attachmentCount: message.attachments.size, createdAt: new Date(message.editedTimestamp ?? message.createdTimestamp).toISOString()
  };
}

export function createBot(config: Config, classifierFor: (route: RouteSelection) => Classifier, store: CaseStore): Client {
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
  let inFlight = 0;

  function actorFor(interaction: ButtonInteraction | ChatInputCommandInteraction): Actor {
    const permissions = new Set<Permission>();
    if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) permissions.add('manage_messages');
    if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) permissions.add('manage_guild');
    const roles = interaction.member?.roles;
    return { userId: interaction.user.id, ownerId: interaction.guild?.ownerId ?? '', permissions,
      roleIds: new Set(roles ? Array.isArray(roles) ? roles : [...roles.cache.keys()] : []) };
  }

  async function sendReview(item: ReviewCase, excerpt?: string, includeContent = true): Promise<Message> {
    if (!config.reviewChannelId) throw new Error('Review channel is not configured');
    const channel = await client.channels.fetch(config.reviewChannelId);
    if (!channel?.isSendable() || !('guildId' in channel) || channel.guildId !== config.guildId) throw new Error('Review channel is not a sendable channel in the configured server');
    const guild = client.guilds.cache.get(config.guildId);
    if (!guild || !('permissionsFor' in channel)) throw new Error('Cannot verify review channel privacy');
    const publicPermissions = channel.permissionsFor(guild.roles.everyone);
    if (!publicPermissions) throw new Error('Cannot verify review channel permissions');
    if (publicPermissions.has(PermissionFlagsBits.ViewChannel)) {
      throw new Error('Review channel is visible to everyone; refusing to send case content');
    }
    const detail = excerpt ? `\nPreview: ${excerpt}` : includeContent ? '' : '\nText pending until the hold succeeds.';
    return await channel.send({
      content: `Case ${item.id}\nType: ${item.decision} | ${item.surface}\nRoute: ${item.routeId ?? 'default'}\nReasons: ${item.reasons.join(', ') || 'manual submission'}\nAuthor: <@${item.authorId}> | Channel: <#${item.channelId}>${detail}\nCase expires in 24 hours; staff card retention follows server policy.`,
      allowedMentions: { parse: [] }, components: includeContent ? [buttons(item.id)] : [],
      embeds: includeContent && item.content ? [new EmbedBuilder().setTitle('Full text for review').setDescription(escapeMarkdown(item.content))] : []
    });
  }

  async function processMessage(message: Message, trigger: Trigger): Promise<void> {
    if (!message.inGuild() || message.guildId !== config.guildId || message.author.bot || message.webhookId) return;
    if (message.channelId === config.reviewChannelId || message.channelId === config.submissionChannelId) return;
    const parentId = message.channel.isThread() ? message.channel.parentId : null;
    if (!config.monitoredChannelIds.includes(message.channelId) && !(parentId && config.monitoredChannelIds.includes(parentId))) return;
    if (inFlight >= 8) { console.warn('Classification capacity reached; message skipped.'); return; }
    inFlight++;
    try { await classifyAndAct(message, trigger, parentId); } finally { inFlight--; }
  }

  async function classifyAndAct(message: Message, trigger: Trigger, parentId: string | null): Promise<void> {
    const event = normalized(message);
    if (!event.content.trim() && event.attachmentCount === 0) return;
    const route = selectRoute(config.routes, { trigger, channelId: event.channelId, parentId, surface: event.surface },
      { id: 'default', provider: config.provider, mode: config.mode });
    let result;
    try { result = await classifierFor(route).classify(event); }
    catch (error) { console.error('Classifier unavailable:', error instanceof Error ? error.message : 'unknown error'); return; }
    const policy = decide(event, result, route.mode);
    if (policy.decision === 'allow') return;
    if (route.mode === 'observe') {
      console.info(`Observation: ${policy.reasons.join(', ')} on ${event.surface} via ${route.id}`);
      return;
    }
    // Skip this classification when the message changed during inference.
    if (!await stillCurrent(event, async () => normalized(await message.fetch(true)))) return;
    const item = await store.create({
      eventId: event.id, guildId: event.guildId, channelId: event.channelId, authorId: event.authorId,
      surface: event.surface, decision: policy.decision, reasons: policy.reasons,
      routeId: route.id, provider: result.provider, model: result.model,
      ...(policy.decision === 'hold' ? { content: event.content } : {})
    });
    if (policy.decision === 'hold') {
      await store.withPending(item.id, async (current, save) => {
        let alert: Message;
        try { alert = await sendReview(current, undefined, false); }
        catch (error) { await save({ ...current, status: 'dismissed', content: undefined }); throw error; }
        let deleted: boolean;
        try { deleted = await actIfCurrent(event, async () => normalized(await message.fetch(true)), async () => { await message.delete(); }); }
        catch {
          await save({ ...current, decision: 'flag', content: undefined, reasons: [...current.reasons, 'delete_failed'] });
          await alert.edit({ content: alert.content.replace('Type: hold', 'Type: flag').replace('Text pending until the hold succeeds.', 'Delete failed; original remains visible.'), components: [buttons(item.id)], embeds: [] });
          console.warn(`Hold delete failed for case ${item.id}; original remains visible.`);
          return;
        }
        if (!deleted) {
          await save({ ...current, status: 'dismissed', content: undefined, reasons: [...current.reasons, 'message_changed_before_delete'] });
          try { await alert.edit({ content: `${alert.content}\nClosed: original changed or became unavailable before deletion.`, components: [], embeds: [] }); }
          catch { console.warn(`Closed case ${item.id} could not update its staff card.`); }
          return;
        }
        try {
          await alert.edit({ content: alert.content.replace('Text pending until the hold succeeds.', 'Held text is ready for review.'),
            embeds: [new EmbedBuilder().setTitle('Full text for review').setDescription(escapeMarkdown(current.content ?? ''))],
            components: [buttons(item.id)] });
          await save({ ...current, reviewReady: true });
        }
        catch {
          await save({ ...current, reasons: [...current.reasons, 'review_card_update_failed'] });
          console.warn(`Held case ${item.id} needs a staff card update; inspect the local case before approval.`);
        }
      });
      return;
    }
    await sendReview(item, preview(event.content));
  }

  async function handleSubmit(interaction: ChatInputCommandInteraction): Promise<void> {
    if (interaction.guildId !== config.guildId || !config.submissionChannelId || !config.reviewChannelId) {
      await interaction.reply({ content: 'Submissions are not configured for this server.', flags: MessageFlags.Ephemeral });
      return;
    }
    const content = interaction.options.getString('text', true).trim();
    if (!content || content.length > 1800) {
      await interaction.reply({ content: 'Submit 1 to 1800 characters.', flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const event: ModerationEvent = { spec: 'modbot.event.v1', id: interaction.id, guildId: interaction.guildId!,
      channelId: config.submissionChannelId, authorId: interaction.user.id, content, surface: 'submission',
      mentionCount: 0, attachmentCount: 0, createdAt: new Date().toISOString() };
    const route = selectRoute(config.routes, { trigger: 'submission', channelId: event.channelId, surface: event.surface },
      { id: 'default', provider: config.provider, mode: 'review' });
    let provider: string = route.provider;
    let model = route.model ?? 'unavailable';
    let reasons = ['requested_review'];
    try {
      const classification = await classifierFor(route).classify(event);
      provider = classification.provider;
      model = classification.model;
      reasons = [...reasons, ...decide(event, classification, 'review').reasons];
    } catch { reasons.push('classification_unavailable'); }
    const item = await store.create({
      eventId: interaction.id, guildId: interaction.guildId!, channelId: config.submissionChannelId,
      authorId: interaction.user.id, surface: 'submission', decision: 'submission', reasons,
      routeId: route.id, provider, model, content
    });
    try {
      await sendReview(item);
      await interaction.editReply(`Submitted for moderator review. Case ${item.id}.`);
    } catch {
      await store.withPending(item.id, async (current, save) => { await save({ ...current, status: 'dismissed', content: undefined }); });
      await interaction.editReply('The review queue is unavailable. Please try again later.');
    }
  }

  async function handleReview(interaction: ButtonInteraction): Promise<void> {
    if (interaction.guildId !== config.guildId || !canReview(actorFor(interaction), config.accessRoles)) {
      await interaction.reply({ content: 'You are not allowed to review cases.', flags: MessageFlags.Ephemeral });
      return;
    }
    if (interaction.channelId !== config.reviewChannelId) {
      await interaction.reply({ content: 'Review this case in the configured staff channel.', flags: MessageFlags.Ephemeral });
      return;
    }
    const match = /^review:(approve|dismiss):([0-9a-f-]{36})$/.exec(interaction.customId);
    if (!match) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const action = match[1];
    const id = match[2]!;
    try {
      const outcome = await store.withPending(id, async (item, save) => {
        if (item.guildId !== config.guildId) throw new Error('Wrong server');
        if (action === 'approve' && !canApproveCase(item)) throw new Error('Held text is not ready for review; inspect the local case and recover the staff card.');
        let publishedMessageId: string | undefined;
        if (action === 'approve' && item.content) {
          const channel = await client.channels.fetch(item.channelId);
          if (!channel?.isSendable() || !('guildId' in channel) || channel.guildId !== config.guildId) throw new Error('Destination is unavailable or outside the configured server');
          const published = await channel.send({
            content: `Approved submission from <@${item.authorId}>:\n${item.content}`,
            allowedMentions: { parse: [] }, flags: MessageFlags.SuppressEmbeds
          });
          publishedMessageId = published.id;
        }
        await save({ ...item, status: action === 'approve' ? 'approved' : 'dismissed',
          reviewerId: interaction.user.id, reviewedAt: new Date().toISOString(), publishedMessageId });
        return action === 'approve' ? (publishedMessageId ? 'Approved and posted' : 'Approved; original remains in place') : 'Dismissed';
      });
      await interaction.message.edit({ components: [] });
      await interaction.editReply(outcome);
    } catch (error) {
      await interaction.editReply(error instanceof Error ? error.message : 'Review failed');
    }
  }

  async function handleModbot(interaction: ChatInputCommandInteraction): Promise<void> {
    if (interaction.guildId !== config.guildId) return;
    const actor = actorFor(interaction);
    const action = interaction.options.getSubcommand();
    const allowed = action === 'routes' ? canConfigure(actor, config.accessRoles) : canViewConfig(actor, config.accessRoles);
    if (!allowed) {
      await interaction.reply({ content: 'You are not allowed to view these settings.', flags: MessageFlags.Ephemeral });
      return;
    }
    const content = action === 'routes'
      ? (config.routes.length ? config.routes.map(route => `${route.id}: ${route.trigger}, ${route.provider}, ${route.mode}`).join('\n') : 'No custom routes; the default applies.')
      : `Default: ${config.provider} / ${config.mode}\nCustom routes: ${config.routes.length}\nMonitored channels: ${config.monitoredChannelIds.length}\nSettings are loaded from the local instance configuration.`;
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
  }

  client.once(Events.ClientReady, async ready => {
    if (ready.user.id !== config.clientId) {
      console.error('DISCORD_CLIENT_ID does not match the logged-in bot; shutting down.');
      await ready.destroy();
      return;
    }
    const command = new SlashCommandBuilder().setName('submit').setDescription('Send a text post to moderators before publication')
      .addStringOption(option => option.setName('text').setDescription('Text to review').setRequired(true).setMaxLength(1800));
    if (config.submissionChannelId && config.reviewChannelId) {
      try { await ready.application.commands.create(command.toJSON(), config.guildId); }
      catch (error) { console.error('Command registration failed:', error); }
    }
    const modbot = new SlashCommandBuilder().setName('modbot').setDescription('View ModBot instance settings')
      .addSubcommand(option => option.setName('status').setDescription('View current classifier routing summary'))
      .addSubcommand(option => option.setName('routes').setDescription('View configured classifier routes'));
    try { await ready.application.commands.create(modbot.toJSON(), config.guildId); }
    catch (error) { console.error('ModBot command registration failed:', error); }
    await store.purgeExpired();
    const timer = setInterval(() => { void store.purgeExpired().catch(error => console.error('Case purge failed:', error)); }, 3600_000);
    timer.unref();
    console.info(`Bot ready in ${config.mode} mode with ${config.provider} classifier.`);
  });
  client.on(Events.MessageCreate, message => { void processMessage(message, 'message_create').catch(error => console.error('Message processing failed:', error)); });
  client.on(Events.MessageUpdate, (_old, updated) => {
    void (async () => { const message = updated.partial ? await updated.fetch() : updated; await processMessage(message, 'message_update'); })()
      .catch(error => console.error('Edited message processing failed:', error));
  });
  client.on(Events.InteractionCreate, interaction => {
    if (interaction.isChatInputCommand() && interaction.commandName === 'submit') void handleSubmit(interaction).catch(error => console.error('Submission failed:', error));
    if (interaction.isChatInputCommand() && interaction.commandName === 'modbot') void handleModbot(interaction).catch(error => console.error('ModBot command failed:', error));
    if (interaction.isButton() && interaction.customId.startsWith('review:')) void handleReview(interaction).catch(error => console.error('Review failed:', error));
  });
  return client;
}
