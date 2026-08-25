# PPS 1.0.x — the real API surface

Extracted from the published artifacts on the public Volcengine Maven
(`https://artifact.bytedance.com/repository/Volcengine/`), the same repo
`withPicoGradle` already registers. Signatures below are `javap` output from
`com.pico.pps:platform-service-*:1.0.0` and `com.pico.pps:pps_sdk_base:1.0.0`
— not documentation, not inference.

Reproduce with:

```bash
curl -O "https://artifact.bytedance.com/repository/Volcengine/com/pico/pps/platform-service-auth/1.0.0/platform-service-auth-1.0.0.aar"
unzip -o platform-service-auth-1.0.0.aar && mkdir cls && (cd cls && unzip -o ../classes.jar)
javap -classpath cls com.pico.pps.sdk.auth.ISignInClient
```

## The async primitive

Every service call returns `Task<T>`. It is listener-based, not coroutines and
not a plain callback:

```java
public final class com.pico.pps.sdk.base.Task<Result> {
    public final Task<Result> addOnSuccessListener(OnSuccessListener<Result>);
    public final Task<Result> addOnFailureListener(OnFailureListener);
    public final Task<Result> addOnCancelListener(OnCancelListener);
    public final void cancel();
    public final void runTask(io.reactivex.Maybe<MatrixResult<Result>>);
}
```

Consequences for every Kotlin HybridObject:

- Each call wires **three** listeners, not one. Cancel is a distinct outcome
  from failure and needs its own mapping — today the family has no error code
  for it.
- `runTask` takes an RxJava `Maybe`, so **RxJava is on the classpath** whether
  or not the app wants it.
- Payloads are Square **Wire** protobuf messages (`extends com.squareup.wire.Message`),
  so responses are read via generated fields, e.g.
  `GetCurrentOpenUserInfoResponse.loginUser` → `OpenUserInfo`.
- Pagination is a cursor object, not a token string:
  `NextInfo(hasNext: Boolean, nextId: Long, bodyParams: String)`, consumed by
  `getNext…(NextInfo)` methods.

## Per-service surfaces

### auth — `PicoSignInClient.getSignInClient(Context)` → `ISignInClient`

```java
Task<SignInResponse>                    signIn(SignInRequest)
Task<Unit>                              signOut()
Task<GetCurrentOpenUserInfoResponse>    getUserInfo()
Task<GetAccessTokenResponse>            getAccessToken()
Task<AuthScopeResponse>                 sendAuthScopesRequest(AuthScopeRequest)
Task<OAuthByScopesResponse>             requestAuthScopes(List<String>)
Task<GetAuthorizedScopesResponse>       getAuthorizedScopes()
Task<Unit>                              cancelAuthorization()
Task<IsAdultResponse>                   isAdult()
```

`SignInRequest(List<String> scopeList, AUTH_TYPE authType)` — sign-in takes a
scope list, not a bare call.

### iap — `PicoIapClient.getIapClient(Context)` → `IapClient`

```java
Task<GetProductListResponse>              getProductList(List<String>, String)
Task<PurchaseProductResponse>             purchaseProduct(Product, Map<String,String>)
Task<QueryProductPurchaseStatusResponse>  queryProductPurchaseStatus(String)
Task<GetPurchasedProductListResponse>     getPurchasedProductList(String)
Task<ConsumeProductResponse>              consumeProduct(String)
Task<QueryProductSubscriptionStatusResponse> queryProductSubscriptionStatus(String)
```

### achievement — `AchievementClient.getArchievementClient(Context)` → `IArchievementClient`

Note `AchievementClient.init(Context)` exists and is separate from the getter.

```java
Task<AchievementUpdate>          unlock(String, byte[])
Task<AchievementUpdate>          addCount(String, long, byte[])
Task<AchievementUpdate>          addFields(String, String, byte[])
Task<AchievementDefinitionList>  getAllDefinitions(int, int)
Task<AchievementDefinitionList>  getDefinitionsByName(String[])
Task<AchievementProgressList>    getProgressByName(String[])
Task<AchievementProgressList>    getAllProgress(int, int)
```

### leaderboard — `LeaderboardClient.getLeaderboardClient(Context)` → `ILeaderboardClient`

```java
Task<LeaderboardArray>       getLeaderboardArray(String)
Task<LeaderboardEntryArray>  getEntries(String, int, int, int, int)
Task<LeaderboardEntryArray>  getEntriesByIds(String, int, int, int, List<String>)
Task<LeaderboardEntryArray>  getEntriesAfterRank(String, int, int, long)
Task<Boolean>                writeEntry(String, long, byte[], boolean)
Task<Boolean>                writeEntryWithSupplementaryMetric(String, long, long, byte[], boolean)
```

### friend — `PicoFriendClient.getFriendClient(Context)` → `IFriendClient`

```java
Task<GetFriendsResponse>            getFriends()
Task<GetFriendsResponse>            getNextFriendList(NextInfo)
Task<Boolean>                       launchFriendRequestFlow(String)
Task<List<OpenUserInfo>>            loadAccountInfo(List<String>)
Task<LoadFriendsAndRoomsResponse>   getFriendsAndRooms()
Task<LoadFriendsAndRoomsResponse>   getNextFriendsAndRooms(NextInfo)
```

No accept / decline / remove / block / unblock. The family's seams for those
are correct.

### social — `PicoSocialClient.getSocialClient(Context)` → `ISocialClient`

`PicoSocialClient.init(Activity)` — takes an **Activity**, not a Context.

```java
Task<Boolean>                    setPresence(PresenceOptions) / clearPresence()
Task<InvitableUsersListResult>   getInvitableUsers(InviteOptions) / getNextInvitableUsersList(NextInfo)
Task<Boolean>                    launchPresenceInvitePanel()
Task<Boolean>                    launchInviteUserJoinRoomFlow(String)
Task<Boolean>                    launchInviteUserJoinChallengeFlow(String)
Task<List<SentInviteInfo>>       sendInvites(List<String>, String)
Task<InvitedInfoListResult>      getSentInvites() / getNextSentInvitesListPage(NextInfo)
Task<DestinationsListResult>     getDestinations() / getNextDestinationListPage(NextInfo)
Task<String>                     launchApp(LaunchAppOptions) / launchAppByAppId(LaunchAppOptions) / launchStore()
LaunchDetails                    getLaunchDetails()            // synchronous
void                             setLaunchIntentChangeCallback(ILaunchIntentChangeCallback)
Task<Boolean>                    shareVideo(String, String) / shareImages(List<String>)
```

### push — `PPSPushClient.getClientImpl(Context)` → `IPPSPushClient`

Not `Task`-based; plain callbacks.

```java
void register(String appId, String fcmToken, IRegisterPPSPushCallback)
void unRegister(IUnregisterPPSPushCallback)
void setPushMsgReceiver(IPPSPushMsgReceiver)
void removePushMsgReceiver()
```

### entitlement — `PicoEntitlementClient.getEntitlementClient(Context)`

```java
Task<EntitlementCheckResponse> entitlementCheck(boolean)
```

### compliance — `PicoComplianceClient.getComplianceClient(Context)`

```java
Task<ComplianceResponse> detectSensitive(int, String)
```

### sport — `PicoSportClient.getSportClient(Context)`

```java
Task<SportGetUserInfoResponse>      getUserInfo()
Task<SportGetDailySummaryResponse>  getDailySummary(Long, Long)
Task<SportGetSummaryResponse>       getSummary(Long, Long)
```

### speech — `PicoSpeechClient.getSportClient(Context)` → `ISpeechClient`

The getter really is named `getSportClient` — a copy-paste bug in PICO's own
SDK. Any reflection lookup must use that name, not `getSpeechClient`.

```java
void initAsrEngine(Application)
int  startAsr(boolean, int, boolean)
int  stopAsr()
int  unInitAsrEngine()
void setAsrResultCallback(SpeechListener)
```

## Services with no artifact

There is no `platform-service-rtc`, `-room`, or `-storage` on the repo. The
family's `unavailable` status for rtc, rooms and storage is correct: rooms are
reachable only as read-only data through `friend.getFriendsAndRooms()`.
