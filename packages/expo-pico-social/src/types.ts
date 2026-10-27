// The Nitro spec in PicoSocial.nitro.ts is the single source of these types;
// this module re-exports them under the path the package has always used.
export type {
  FriendshipStatus,
  PresenceStatus,
  SocialUser,
  FriendRequest,
  FriendListResult,
  SentInvite,
  InviteOptions,
  PresenceOptions,
  FriendPresenceChangedEvent,
  InviteReceivedEvent,
  PicoLaunchType,
  PicoLaunchResult,
  PicoLaunchDetails,
  PicoDestination,
  InvitableUsersResult,
  SentInviteListResult,
  DestinationListResult,
  LaunchAppOptions,
  PicoSocial,
} from './PicoSocial.nitro';
