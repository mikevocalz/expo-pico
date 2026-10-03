package expo.modules.pico.leaderboards

/**
 * Maps the JS `LeaderboardFilter` / `LeaderboardStartAt` strings (src/types.ts) to
 * PPS enum ints. Only exact TS values are accepted; anything else rejects so a typo
 * never silently becomes the global board or a different start position.
 *
 * PPS `ppfLeaderboardFilterType`: FilterNone, FilterFriends, FilterUnknown, FilterUserIds.
 * PPS `ppfLeaderboardStartAt`: StartAtTop, StartAtCenteredOnViewer,
 *   StartAtCenteredOnViewerOrTop, StartAtUnknown.
 */
internal object LeaderboardQueryArgs {
    private const val FILTER_ENUM = "ppfLeaderboardFilterType"
    private const val START_AT_ENUM = "ppfLeaderboardStartAt"

    fun filter(value: String): PpsEnumValue = when (value) {
        "none" -> PpsEnumReader.read(FILTER_ENUM, "ppfLeaderboard_FilterNone")
        "friends" -> friendsFilter()
        "viewer-and-friends" -> PpsEnumValue.Rejected(
            "UNSUPPORTED_FILTER",
            "Leaderboard filter 'viewer-and-friends' is not supported: the PICO Platform SDK " +
                "has no such filter (ppfLeaderboardFilterType offers only None, Friends and UserIds)."
        )
        else -> PpsEnumValue.Rejected(
            "INVALID_ARGUMENT",
            "Unknown leaderboard filter '$value'. Expected 'none' or 'friends'."
        )
    }

    fun startAt(value: String): PpsEnumValue = when (value) {
        "top" -> PpsEnumReader.read(START_AT_ENUM, "ppfLeaderboard_StartAtTop")
        "centered-on-viewer" -> centeredOnViewer()
        else -> PpsEnumValue.Rejected(
            "INVALID_ARGUMENT",
            "Unknown leaderboard startAt '$value'. Expected 'top' or 'centered-on-viewer'."
        )
    }

    fun friendsFilter(): PpsEnumValue = PpsEnumReader.read(FILTER_ENUM, "ppfLeaderboard_FilterFriends")

    fun centeredOnViewer(): PpsEnumValue =
        PpsEnumReader.read(START_AT_ENUM, "ppfLeaderboard_StartAtCenteredOnViewer")
}
