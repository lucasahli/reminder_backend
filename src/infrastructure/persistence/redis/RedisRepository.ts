import { createClient, RedisClientType } from "redis";
import DataLoader from "dataloader";

import { Login, User, Device, Session, RefreshToken, SessionActivity } from "../../../core/components/userSessionContext/domain/entities/index.js";
import { Reminder, LocationWithRadius } from "../../../core/components/reminderContext/domain/entities/index.js";
import { UserRole } from "../../../core/sharedKernel/UserRole.js";
import {DeviceType, SessionStatus} from "../../../core/components/userSessionContext/domain/valueObjects/index.js";
import {
  LoginRepository,
  UserRepository,
  ReminderRepository,
  RefreshTokenRepository,
  SessionRepository,
  DeviceRepository,
  SessionActivityRepository
} from "../../../core/portsAndInterfaces/interfaces/index.js";

// TODO: Move this to hasher or password service
function generateRandomStringWithLength(length: number) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// implements LoginRepository, UserRepository, ReminderRepository
export class RedisRepository
  implements
      LoginRepository,
      UserRepository,
      ReminderRepository,
      DeviceRepository,
      SessionRepository,
      RefreshTokenRepository,
      SessionActivityRepository
{
  redis: RedisClientType;
  loginLoader: DataLoader<string, Login | null>
  userLoader: DataLoader<string, User | null>
  reminderLoader: DataLoader<string, Reminder | null>
  deviceLoader: DataLoader<string, Device | null>
  sessionLoader: DataLoader<string, Session | null>
  sessionActivityLoader: DataLoader<string, SessionActivity | null>
  refreshTokenLoader: DataLoader<string, RefreshToken | null>

  constructor(redisHost: string | null, redisPort: string | null) {
    const redisUrl =
      `redis://${redisHost}:${redisPort}` || "redis://localhost:6379";
    this.redis = createClient({ url: redisUrl });
    this.redis.on("error", (err) => console.log("Redis Client Error", err));
    this.redis.connect().then(() => console.log("Redis connected"));


    this.loginLoader = new DataLoader<string, Login | null>(async (ids) => {
      // Fetch data from Redis for the provided IDs
      const promises = ids.map(async (id) => {
        let data = await this.redis.hGetAll("login:" + id);
        data = {
          ...data, // Copy existing key-value pairs
          id: id, // Append the new key-value pair
        }
        if (Login.isValidLoginData(data)) {
          console.log("Valid LoginData: ", data);
          return Login.fromJSON(data);
        } else {
          console.log("No login data found in redis for id: ", id);
          return null;
        }
      });
      return Promise.all(promises);
    });

    // Create a DataLoader instance for user IDs
    //  accept string keys (user IDs) and return a User | null type,
    //  where User is the type of your user object, and null indicates
    //  that the user may not be found in Redis.

    this.userLoader = new DataLoader<string, User | null>(async (userIds) => {
      // Fetch user data from Redis for the provided user IDs
      const userPromises = userIds.map(async (id) => {
        let userData = await this.redis.hGetAll("user:" + id);
        userData = {
          ...userData, // Copy existing key-value pairs
          id: id, // Append the new key-value pair
        }
        if (User.isValidUserData(userData)) {
          return User.fromJSON(userData);
        } else {
          console.log("No user data found in redis for id: ", id);
          return null;
        }
      });

      return Promise.all(userPromises);
    });

    this.reminderLoader = new DataLoader<string, Reminder | null>(async (reminderIds) => {
      // Fetch user data from Redis for the provided user IDs
      const reminderPromises = reminderIds.map(async (id) => {
        let reminderData = await this.redis.hGetAll("reminder:" + id);
        reminderData = {
          ...reminderData, // Copy existing key-value pairs
          id: id, // Append the new key-value pair
        }
        if (Reminder.isValidReminderData(reminderData)) {
          return Reminder.fromJSON(reminderData);
        } else {
          console.log("No reminder data found in redis for id: ", id);
          return null;
        }
      });
      return Promise.all(reminderPromises);
    });

    this.deviceLoader = new DataLoader<string, Device | null>(async (ids) => {
      // Fetch data from Redis for the provided IDs
      const promises = ids.map(async (id) => {
        let data = await this.redis.hGetAll("device:" + id);
        data = {
          ...data, // Copy existing key-value pairs
          id: id, // Append the new key-value pair
        }
        if (Device.isValidDeviceData(data)) {
          return Device.fromJSON(data);
        } else {
          console.log("No valid device data found in redis for id: ", id);
          console.log("device data found in redis: ", data);
          return null;
        }
      });
      return Promise.all(promises);
    });

    this.sessionLoader = new DataLoader<string, Session | null>(async (ids) => {
      // Fetch data from Redis for the provided IDs
      const promises = ids.map(async (id) => {
        let data = await this.redis.hGetAll("session:" + id);
        data = {
          ...data, // Copy existing key-value pairs
          id: id, // Append the new key-value pair
        }
        if (Session.isValidSessionData(data)) {
          return Session.fromJSON(data);
        } else {
          console.log("No session data found in redis for id: ", id);
          return null;
        }
      });
      return Promise.all(promises);
    });

    this.sessionActivityLoader = new DataLoader<string, SessionActivity | null>(async (ids) => {
      // Fetch data from Redis for the provided IDs
      const fetchPromises = ids.map(async (id) => {
        let data = await this.redis.hGetAll("session_activity:" + id);
        data = {
          ...data, // Copy existing key-value pairs
          id: id, // Append the new key-value pair
        }
        if (SessionActivity.isValidSessionData(data)) {
          return SessionActivity.fromJSON(data);
        } else {
          console.log("No sessionActivity data found in redis for id: ", id);
          return null;
        }
      });

      return Promise.all(fetchPromises);
    });

    this.refreshTokenLoader = new DataLoader<string, RefreshToken | null>(async (ids) => {
      // Fetch data from Redis for the provided IDs
      const promises = ids.map(async (id) => {
        let data = await this.redis.hGetAll("refresh_token:" + id);
        data = {
          ...data, // Copy existing key-value pairs
          id: id, // Append the new key-value pair
        }
        if (RefreshToken.isValidRefreshTokenData(data)) {
          return RefreshToken.fromJSON(data);
        } else {
          console.log("No refreshToken data found in redis for id: ", id);
          return null;
        }
      });
      return Promise.all(promises);
    });

  }

  async connect() {
    await this.redis.connect();
  }

  //region Login
  async createLogin(
    email: string,
    password: string,
    associatedUserIds: string[],
    associatedDeviceIds: string[],
    associatedSessionIds: string[],
  ): Promise<Login> {
    // Check if Login already exists
    // if (await this.redis.hGet("login_emails", email)) {
    //   return Promise.reject("Login with that email already exists!");
    // }
    const loginId = await this.redis.incr("next_login_id"); // Generate Login-ID
    const created = new Date(Date.now());
    const authsecret = generateRandomStringWithLength(16); // Generate Authentication Secret
    await this.redis.hSet("auths", authsecret, loginId); // Store the Authentication Secret

    await this.redis.sAdd("logins", loginId.toString());
    await this.redis.hSet("login_emails", email, loginId);
    await this.redis.hSet("login:" + loginId.toString(), [
      ...Object.entries({
        created: created.toISOString(),
        modified: created.toISOString(),
        email: email,
        password: password,
        auth: authsecret,
        associatedUserIds: JSON.stringify(associatedUserIds),
        associatedDeviceIds: JSON.stringify(associatedDeviceIds),
        associatedSessionIds: JSON.stringify(associatedSessionIds)
      }).flat(),
    ]);

    // If available, store the associated User-ID's
    // if (associatedUserIds.length > 0) {
    //   await this.redis.hSet("login:" + loginId.toString() + "associated_user_ids", associatedUserIds);
    // }
    // if (associatedDeviceIds.length > 0) {
    //   await this.redis.hSet("login:" + loginId.toString() + "associated_device_ids", associatedDeviceIds);
    // }
    // if (associatedSessionIds.length > 0) {
    //   await this.redis.hSet("login:" + loginId.toString() + "associated_session_ids", associatedSessionIds);
    // }
    // Return the Login Object
    return Promise.resolve(
      new Login(loginId.toString(), created, created, email, password, associatedUserIds, associatedDeviceIds, associatedSessionIds)
    );
  }

  async getAllLoginIds(): Promise<string[] | null> {
    const setExists = await this.redis.exists('logins');
    if (setExists === 0) {
      // The Set does not exist
      return null;
    }
    return await this.redis.sMembers('logins');
  }

  async getLoginByEmail(email: string): Promise<Login | null> {
    const loginId = await this.redis.hGet("login_emails", email);
    if (!loginId) {
      // console.log(`No login with that email (${email}) in redis!!!`);
      return null;
    }
    return this.loginLoader.load(loginId);

    // const loginData = await this.redis.hGetAll("login:" + loginId);
    // const associatedUserIds = await this.redis.sMembers("login:" + loginId + "associated_user_ids");
    // const associatedDeviceIds = await this.redis.sMembers("login:" + loginId + "associated_device_ids");
    // const associatedSessionIds = await this.redis.sMembers("login:" + loginId + "associated_session_ids");
    //
    // if(loginData && associatedUserIds){
    //   return new Login(
    //       loginId,
    //       new Date(loginData.created),
    //       new Date(loginData.modified),
    //       loginData.email,
    //       loginData.password,
    //       associatedUserIds,
    //       associatedDeviceIds,
    //       associatedSessionIds
    //   );
    // }
    // return null;
  }

  async getLoginIdBySessionId(sessionId: string): Promise<string | null> {
    const loginId = await this.redis.hGet("session:" + sessionId, "associatedLoginId");
    if (!loginId) {
      // console.log(`No Login with that sessionId (${sessionId}) in redis!!!`);
      return null;
    }
    return loginId;
  }

  getLoginById(id: string): Promise<Login | null> {
    return this.loginLoader.load(id);
    // return new Promise<Login | null>(async (resolve, reject) => {
    //   //   const loginData = await this.redis.hGetAll("login:" + id);
    //   //   const associatedUserIds = await this.redis.sMembers(
    //   //     "login:" + id + "associated_user_ids"
    //   //   );
    //   //   if (loginData && associatedUserIds) {
    //   //     console.log("Login Data: ", loginData);
    //   //     return resolve(
    //   //       new Login(id, loginData.email, loginData.password, associatedUserIds)
    //   //     );
    //   //   } else {
    //   //     console.log("No login data found in redis for id: ", id);
    //   //     return resolve(null);
    //   //   }
    //
    //   return await Promise.all([
    //     this.redis.hGetAll("login:" + id),
    //     this.redis.sMembers("login:" + id + "associated_user_ids"),
    //     this.redis.sMembers("login:" + id + "associated_device_ids"),
    //     this.redis.sMembers("login:" + id + "associated_session_ids"),
    //   ])
    //       .then((results) => {
    //         if(id === undefined || results[0].email === undefined || results[0].password === undefined){
    //           return resolve(null);
    //         }
    //         else {
    //           return resolve(new Login(id, new Date(results[0].created), new Date(results[0].modified), results[0].email, results[0].password, results[1], results[2], results[3]));
    //         }
    //       })
    //       .catch((reason) => {
    //         console.log("Reason: ", reason);
    //         return resolve(null);
    //       });
    // });
  }

  async updateLogin(updatedLogin: Login): Promise<boolean> {
    // Invalidate the DataLoader cache for this login ID if necessary
    this.loginLoader.clear(updatedLogin.id);
    const currentLoginInRedis = await this.getLoginById(updatedLogin.id);

    if (!currentLoginInRedis) {
      console.log("Login to update is not in redis!!!");
      return false;
    }
    console.log("Current Login: ", currentLoginInRedis);
    console.log("Updated Login: ", updatedLogin);
    if(!updatedLogin.equals(currentLoginInRedis)){
      const updatedLoginJson = updatedLogin.toJSON();
      const entries = Object.entries(updatedLoginJson)
          .filter(([key, value]) => key !== 'id' && value !== undefined) // Exclude 'id' and undefined values
          .flatMap(([key, value]) => [key, value]); // Keep only defined values

      const args = ['HSET', `login:${currentLoginInRedis.id}`, ...entries];
      return await this.redis.sendCommand(args)
          .then(() => {
            console.log("Login updated...---------------");
            this.loginLoader.clear(updatedLogin.id);
            return true;
          })
          .catch((error) => {
            return false;
          });
    }
    else {
      return false;
    }
  }

  async deleteLogin(id: string): Promise<boolean> {
    const loginData = await this.redis.hGetAll("login:" + id);
    if (!loginData) {
      return Promise.reject("No login found with id: " + id);
    }
    // await this.redis.hSet("logins", email, loginId);
    await this.redis.hDel("login_emails", loginData.email);
    // await this.redis.hSet("auths", authsecret, loginId);
    await this.redis.hDel("auths", loginData.auth);
    // await this.redis.sAdd("login:" + loginId.toString() + "associated_user_ids", associatedUserIds);
    const associatedUserIds = await this.redis.sMembers(
        "login:" + id + "associated_user_ids"
    );
    await this.redis.sRem(
        "login:" + id + "associated_user_ids",
        associatedUserIds
    );

    const allFields = await this.redis.hKeys("login:" + id);
    const nbrOfDeletedFields = await this.redis.hDel("login:" + id, allFields);

    return Promise.resolve(nbrOfDeletedFields > 0);
  }

  //endregion

  //region Device
  async createDevice(deviceIdentifier: string, userAgentString: string, deviceType: DeviceType, deviceName: string, deviceOperatingSystem: string, lastUsed: Date, associatedSessionIds: string[]): Promise<Device> {
    // Check if Device with that deviceIdentifier already exists
    const keyType = await this.redis.type("deviceIdentifiers");
    if (keyType === 'hash' && await this.redis.hGet("deviceIdentifiers", deviceIdentifier)) {
      return Promise.reject("Can not create: Device with that deviceIdentifier (" + deviceIdentifier + ") already exists!");
    }
    const deviceId = await this.redis.incr("next_device_id");
    const created = new Date(Date.now());
    await this.redis.sAdd("devices", deviceId.toString());
    await this.redis.hSet("deviceIdentifiers", deviceIdentifier, deviceId);
    await this.redis.hSet("device:" + deviceId.toString(), [
      ...Object.entries({
        created: created.toISOString(),
        modified: created.toISOString(),
        deviceIdentifier: deviceIdentifier,
        userAgentString: userAgentString,
        deviceType: deviceType,
        deviceName: deviceName,
        deviceOperatingSystem: deviceOperatingSystem,
        lastUsed: lastUsed.toISOString()
      }).flat(),
    ]);
    // Add sessions to associate with this device
    if (associatedSessionIds.length > 0){
      await this.redis.sAdd(
          "device:" + deviceId.toString() + "associated_session_ids",
          associatedSessionIds
      );
    }
    return Promise.resolve(new Device(deviceId.toString(), created, created, deviceIdentifier, userAgentString, deviceType, deviceName, deviceOperatingSystem, created, associatedSessionIds));
  }

  async deleteDevice(id: string): Promise<boolean> {
    const deviceData = await this.redis.hGetAll("device:" + id);
    if (!deviceData) {
      return Promise.reject("No device found with id: " + id);
    }
    // Delete Stuff...
    await this.redis.sRem("devices", id);
    await this.redis.del("device:" + id + "associated_session_ids");
    const nbrOfDeletedFields = await this.redis.del("device:" + id);
    return Promise.resolve(nbrOfDeletedFields > 0);
  }

  async getAllDeviceIds(): Promise<string[] | null> {
    const setExists = await this.redis.exists('devices');
    if (setExists === 0) {
      // The Set does not exist
      return null;
    }
    return await this.redis.sMembers('devices');
  }

  getDeviceById(id: string): Promise<Device | null> {
    return this.deviceLoader.load(id);
  }

  getManyDevicesByIds(ids: string[]): Promise<(Device | Error | null)[]> {
    return this.deviceLoader.loadMany(ids);
  }

  async updateDevice(updatedDevice: Device): Promise<boolean> {
    const currentDevice = await this.getDeviceById(updatedDevice.id);

    if (!currentDevice) {
      return false;
    }
    if (JSON.stringify(currentDevice.associatedSessionIds) !== JSON.stringify(updatedDevice.associatedSessionIds)) {
      // Remove old association
      await this.redis.sRem(
          "device:" + currentDevice.id + "associated_session_ids",
          currentDevice.associatedSessionIds
      );
      // Add new association
      await this.redis.sAdd(
          "device:" + currentDevice.id + "associated_session_ids",
          updatedDevice.associatedSessionIds
      );
    }
    const args = ['HMSET', `device:${currentDevice.id}`, ...Object.entries(updatedDevice.toJSON()).filter(([key]) => key !== 'id').flat()];
    return this.redis.sendCommand(args)
        .then(() => {
          return true;
        })
        .catch(() => {
          return false;
        });
  }

  async getDeviceIdByDeviceIdentifier(deviceIdentifier: string): Promise<string | null> {
    const deviceId = await this.redis.hGet("deviceIdentifiers", deviceIdentifier);
    if (!deviceId) {
      // console.log(`No Device with that deviceIdentifier (${deviceIdentifier}) in redis!!!`);
      return null;
    }
    return deviceId;
  }

  async getDeviceIdBySessionId(sessionId: string): Promise<string | null> {

    const deviceId = await this.redis.hGet("session:" + sessionId, "associatedDeviceId");
    if (!deviceId) {
      // console.log(`No Device with that sessionId (${sessionId}) in redis!!!`);
      return null;
    }
    return deviceId;
  }
  //endregion

  //region Session
  async createSession(startTime: Date, sessionStatus: SessionStatus, associatedSessionActivities: string[], endTime?: Date, associatedDeviceId?: string, associatedLoginId?: string, associatedRefreshTokenId?: string, ): Promise<Session> {
    const sessionId = await this.redis.incr("next_session_id");
    const created = new Date(Date.now());
    await this.redis.sAdd("sessions", sessionId.toString());
    await this.redis.hSet("session:" + sessionId.toString(), [
      ...Object.entries({
        created: created.toISOString(),
        modified: created.toISOString(),
        startTime: startTime.toISOString(),
        sessionStatus: sessionStatus,
        associatedSessionActivities: JSON.stringify(associatedSessionActivities),
        lastActivity: created.toISOString()
      }).flat(),
    ]);
    if(endTime) {
      await this.redis.hSet("session:" + sessionId.toString(), "endTime", endTime.toISOString());
    }
    if(associatedDeviceId) {
      await this.redis.hSet("session:" + sessionId.toString(), "associatedDeviceId", associatedDeviceId);
    }
    if(associatedLoginId) {
      await this.redis.hSet("session:" + sessionId.toString(), "associatedLoginId", associatedLoginId);
    }
    if(associatedRefreshTokenId) {
      await this.redis.hSet("session:" + sessionId.toString(), "associatedRefreshTokenId", associatedRefreshTokenId);
    }
    return Promise.resolve(new Session(sessionId.toString(), created, created, startTime, sessionStatus, created, associatedSessionActivities, endTime ? endTime : undefined, associatedDeviceId ? associatedDeviceId : undefined,associatedLoginId ? associatedLoginId : undefined, associatedRefreshTokenId ? associatedRefreshTokenId : undefined));
  }

  async deleteSession(id: string): Promise<boolean> {
    const sessionData = await this.redis.hGetAll("session:" + id);
    if (!sessionData) {
      return Promise.reject("No session found with id: " + id);
    }
    // Delete Stuff...
    await this.redis.sRem("sessions", id);
    const nbrOfDeletedFields = await this.redis.del("session:" + id);
    return Promise.resolve(nbrOfDeletedFields > 0);
  }

  async getAllSessionIds(): Promise<string[] | null> {
    const setExists = await this.redis.exists('sessions');
    if (setExists === 0) {
      // The Set does not exist
      return null;
    }
    return await this.redis.sMembers('sessions');
  }

  async getManySessionsByIds(ids: string[]): Promise<(Session | Error | null)[]> {
    return this.sessionLoader.loadMany(ids);
  }

  async getSessionIdsByDeviceId(deviceId: string): Promise<string[]> {
    return this.redis.sMembers(
        "device:" + deviceId + "associated_session_ids"
    );
  }

  async getSessionIdBySessionActivityId(sessionActivityId: string): Promise<string | null> {
    let data = await this.redis.hGetAll("session_activity:" + sessionActivityId);
    if (data.associatedSessionId !== null) {
      return data.associatedSessionId;
    }
    return null;
  }

  async getSessionById(id: string): Promise<Session | null> {
    return this.sessionLoader.load(id);
  }

  async updateSession(updatedSession: Session): Promise<boolean> {
    // Invalidate the DataLoader cache for this session ID if necessary
    this.sessionLoader.clear(updatedSession.id);
    const currentSessionInRedis = await this.getSessionById(updatedSession.id);

    if (!currentSessionInRedis) {
      console.log("Session to update is not in redis!!!");
      return false;
    }
    if(!updatedSession.equals(currentSessionInRedis)){
      // updatedSession.printDifferences(currentSessionInRedis);
      const updatedSessionJson = updatedSession.toJSON();
      const entries = Object.entries(updatedSessionJson)
          .filter(([key, value]) => key !== 'id' && value !== undefined) // Exclude 'id' and undefined values
          .flatMap(([key, value]) => [key, value]); // Keep only defined values

      const args = ['HSET', `session:${currentSessionInRedis.id}`, ...entries];
      return await this.redis.sendCommand(args)
          .then(() => {
            // console.log("Session updated...---------------");
            return true;
          })
          .catch((error) => {
            return false;
          });
    }
    else {
      return false;
    }
  }
  //endregion

  //region RefreshToken
  async createRefreshToken(token: string, expiration: Date, revoked: boolean, associatedLoginId: string, associatedDeviceId: string): Promise<RefreshToken> {
    const refreshTokenId = await this.redis.incr("next_refresh_token_id");
    const created = new Date(Date.now());
    await this.redis.sAdd("refresh_tokens", refreshTokenId.toString());
    await this.redis.hSet("refresh_token_strings", token, refreshTokenId);
    await this.redis.hSet("refresh_token:" + refreshTokenId.toString(), [
      ...Object.entries({
        created: created.toISOString(),
        modified: created.toISOString(),
        token: token,
        expiration: expiration.toISOString(),
        revoked: JSON.stringify(revoked),
        associatedLoginId: associatedLoginId,
        associatedDeviceId: associatedDeviceId
      }).flat(),
    ]);

    return Promise.resolve(new RefreshToken(refreshTokenId.toString(), created, created, token, expiration, revoked, associatedLoginId, associatedDeviceId));
  }

  async deleteRefreshToken(id: string): Promise<boolean> {
    const refreshTokenData = await this.redis.hGetAll("refresh_token:" + id);
    if (!refreshTokenData) {
      return Promise.reject("No refreshToken found with id: " + id);
    }
    // Delete Stuff...
    await this.redis.sRem("refresh_tokens", id);
    await this.redis.hDel("refresh_token_strings", refreshTokenData.token);
    const nbrOfDeletedFields = await this.redis.del("refresh_token:" + id);
    return Promise.resolve(nbrOfDeletedFields > 0);
  }

  async getAllRefreshTokenIds(): Promise<string[] | null> {
    const setExists = await this.redis.exists('refresh_tokens');
    if (setExists === 0) {
      // The Set does not exist
      return null;
    }
    return await this.redis.sMembers('refresh_tokens');
  }

  async getManyRefreshTokensByIds(ids: string[]): Promise<(RefreshToken | Error | null)[]> {
    return this.refreshTokenLoader.loadMany(ids);
  }

  async getRefreshTokenById(id: string): Promise<RefreshToken | null> {
    return this.refreshTokenLoader.load(id);
  }

  async updateRefreshToken(updatedRefreshToken: RefreshToken): Promise<boolean> {
    const currentRefreshToken = await this.getRefreshTokenById(updatedRefreshToken.id);

    if (!currentRefreshToken) {
      return false;
    }

    const args = ['HMSET', `refresh_token:${currentRefreshToken.id}`, ...Object.entries(updatedRefreshToken.toJSON()).filter(([key]) => key !== 'id').flat()];

    return this.redis.sendCommand(args)
        .then(() => {
          return true;
        })
        .catch(() => {
          return false;
        });
  }

  async getRefreshTokenIdByTokenString(tokenString: string): Promise<string | null> {
    const refreshTokenId = await this.redis.hGet("refresh_token_strings", tokenString);
    if (!refreshTokenId) {
      return null;
    }
    return refreshTokenId;
  }
  //endregion

  //region User
  async createUser(
      associatedLoginId: string,
      role: UserRole,
      fullName: string
  ): Promise<User> {
    const userIdsAssociatedWithSameLogin = await this.redis.sMembers("login:" + associatedLoginId + "associated_user_ids")
    for(const existingUserId of userIdsAssociatedWithSameLogin){
      const userData = await this.redis.hGetAll("user:" + existingUserId);
      const userRole = userData.role;
      if (userRole == role.toString()){
        return Promise.reject("This Login is already associated with a user of role " + role.toString());
      }
    }
    // Add new user
    const userId = await this.redis.incr("next_user_id");
    const created = new Date(Date.now());
    const numberOfNewAddedFields = await this.redis.hSet("user:" + userId.toString(), [
      ...Object.entries({
        created: created.toISOString(),
        modified: created.toISOString(),
        associatedLoginId: associatedLoginId,
        role: role,
        fullName: fullName,
      }).flat(),
    ]);
    const numberOfElementsAddedToSet = await this.redis.sAdd(
        "login:" + associatedLoginId + "associated_user_ids",
        userId.toString()
    );
    await this.redis.sAdd('users', userId.toString());

    if(numberOfNewAddedFields > 0 && numberOfElementsAddedToSet > 0){
      return Promise.resolve(
          new User(userId.toString(), created, created, associatedLoginId, role, fullName)
      );
    }
    else {
      return Promise.reject("User was not added or existed already!");
    }
  }

  async getAllUserIds(): Promise<string[] | null> {
    const setExists = await this.redis.exists('users');
    if (setExists === 0) {
      // The Set does not exist
      return null;
    }
    return await this.redis.sMembers('users');
  }

  getUserById(id: string): Promise<User | null> {
    return this.userLoader.load(id);
  }

  getManyUsersByIds(ids: string[]): Promise<(User | Error | null)[]> {
    return this.userLoader.loadMany(ids);
  }

  async deleteUser(id: string): Promise<boolean> {
    const userData = await this.redis.hGetAll("user:" + id);
    if (!Object.keys(userData).length) {
      return Promise.reject("No user found with id: " + id);
    }
    await this.redis.sRem(
        "login:" + userData.login + "associated_user_ids",
        id
    );
    const allFields = await this.redis.hKeys("user:" + id);
    const nbrOfDeletedFields = await this.redis.hDel("user:" + id, allFields);
    await this.redis.sRem('users', id);
    return Promise.resolve(nbrOfDeletedFields > 0);
  }

  //endregion

  //region Reminder
  async createReminder(
    title: string,
    ownerId: string,
    idsOfUsersToRemind: string[],
    isCompleted: boolean,
    dateTimeToRemind?: Date,
    locationWithRadius?: LocationWithRadius
  ): Promise<Reminder> {
    // Create a new Reminder-ID
    const reminderId = await this.redis.incr("next_reminder_id");
    const created = new Date(Date.now());
    if(dateTimeToRemind && locationWithRadius){
      // TODO: Handle Reminders with both: dateTimeToRemind && locationWithRadius
    }
    else if(locationWithRadius){
      // TODO: Handle Reminders with location
    }
    else if(dateTimeToRemind){
      await this.redis.hSet("reminder:" + reminderId.toString(), [
        ...Object.entries({
          created: created.toISOString(),
          modified: created.toISOString(),
          title: title,
          ownerId: ownerId,
          idsOfUsersToRemind: JSON.stringify(idsOfUsersToRemind),
          isCompleted: JSON.stringify(isCompleted),
          dateTimeToRemind: dateTimeToRemind.toISOString(),
        }).flat(),
      ]);
    }
    else{
      console.error("Reminder can not be added to Redis: Does not have dateTimeToRemind || locationWithRadius");
    }

    // Add owner association
    await this.redis.sAdd(
      "user:" + ownerId + "reminders",
      reminderId.toString()
    );
    // Add users to remind association
    for (const userToRemindId of idsOfUsersToRemind){
      await this.redis.sAdd(
          "user:" + userToRemindId + "reminder_subscriptions",
          reminderId.toString()
      );
    }
    // Add Reminder-ID to reminders Set
    await this.redis.sAdd('reminders', reminderId.toString());
    // Return the created reminder
    return Promise.resolve(
      new Reminder(reminderId.toString(), new Date(Date.now()), new Date(Date.now()), title, ownerId, idsOfUsersToRemind, isCompleted, dateTimeToRemind, undefined)
    );
  }

  async getAllReminderIds(): Promise<string[] | null> {
    const setExists = await this.redis.exists('reminders');
    if (setExists === 0) {
      // The Set does not exist
      return null;
    }
    return await this.redis.sMembers('reminders');
  }

  getReminderById(id: string): Promise<Reminder | null> {
    return this.reminderLoader.load(id);
  }

  getReminderIdsByOwnerId(ownerId: string): Promise<string[]> {
    return this.redis.sMembers(
        "user:" + ownerId + "reminders"
    );
  }

  async updateReminder(reminder: Reminder): Promise<boolean> {
    const oldReminder = await this.getReminderById(reminder.id);

    if(!oldReminder){
      return false;
    }
    if(oldReminder.ownerId !== reminder.ownerId){
      // Update owner association
      await this.redis.sRem(
          "user:" + oldReminder.ownerId + "reminders",
          reminder.id
      );
    }


    if(JSON.stringify(oldReminder.idsOfUsersToRemind) !== JSON.stringify(reminder.idsOfUsersToRemind)){
      // Update users to remind association
      for (const userToRemindId of oldReminder.idsOfUsersToRemind){
        await this.redis.sRem(
            "user:" + userToRemindId + "reminder_subscriptions",
            reminder.id
        );
      }
      for (const userToRemindId of reminder.idsOfUsersToRemind){
        await this.redis.sAdd(
            "user:" + userToRemindId + "reminder_subscriptions",
            reminder.id
        );
      }
    }


    const args = ['HMSET', `reminder:${reminder.id}`, ...Object.entries(reminder.toJSON()).filter(([key]) => key !== 'id').flat()];

    return this.redis.sendCommand(args)
        .then(() => {
          return true;
        })
        .catch(() => {
          return false;
        });
  }

  async deleteReminder(id: string): Promise<boolean> {
    // Get Reminder to delete
    let reminderData = await this.redis.hGetAll("reminder:" + id);
    reminderData = {
      ...reminderData,
      id: id,
    };
    if (!Reminder.isValidReminderData(reminderData)) {
      return Promise.reject("No reminderData found with id: " + id);
    }
    else {
      const reminderToDelete = Reminder.fromJSON(reminderData);
      // Delete owner association
      await this.redis.sRem("user:" + reminderToDelete.ownerId + "reminders", id);
      // Delete users to remind associations
      for (const userToRemindId of reminderToDelete.idsOfUsersToRemind){
        await this.redis.sRem(
            "user:" + userToRemindId + "reminder_subscriptions",
            id.toString()
        );
      }
      const allFields = await this.redis.hKeys("reminder:" + id);
      if (allFields.length == 0){
        return Promise.reject("No fields to delete");
      }
      const nbrOfDeletedFields = await this.redis.hDel(
          "reminder:" + id,
          allFields
      );
      await this.redis.sRem('reminders', id);
      return Promise.resolve(nbrOfDeletedFields > 0);
    }

  }

  //endregion

  //region SessionActivity
  async createSessionActivity(description: string, associatedSessionId: string): Promise<SessionActivity> {
    // Add new user
    const sessionActivityId = await this.redis.incr("next_session_activity_id");
    const created = new Date();
    const numberOfNewAddedFields = await this.redis.hSet("session_activity:" + sessionActivityId.toString(), [
      ...Object.entries({
        created: created.toISOString(),
        modified: created.toISOString(),
        description: description,
        associatedSessionId: associatedSessionId
      }).flat(),
    ]);
    const numberOfElementsAddedToSet = await this.redis.sAdd(
        "session:" + associatedSessionId + "associated_session_activity_ids",
        sessionActivityId.toString()
    );
    await this.redis.sAdd('session_activities', sessionActivityId.toString());

    if (numberOfNewAddedFields > 0 && numberOfElementsAddedToSet > 0) {
      return Promise.resolve(
          new SessionActivity(sessionActivityId.toString(), created, created, description, associatedSessionId)
      );
    } else {
      return Promise.reject("SessionActivity was not added");
    }
  }

  async deleteSessionActivity(id: string): Promise<boolean> {
    const sessionActivityData = await this.redis.hGetAll("session_activity:" + id);
    if (!Object.keys(sessionActivityData).length) {
      return Promise.reject("No sessionActivity found with id: " + id);
    }
    await this.redis.sRem(
        "session:" + sessionActivityData.associatedSessionId + "associated_session_activity_ids",
        id
    );
    const allFields = await this.redis.hKeys("session_activity:" + id);
    const nbrOfDeletedFields = await this.redis.hDel("session_activity:" + id, allFields);
    await this.redis.sRem('session_activities', id);
    return Promise.resolve(nbrOfDeletedFields > 0);
  }

  async getAllSessionActivityIds(): Promise<string[] | null> {
    const setExists = await this.redis.exists('session_activities');
    if (setExists === 0) {
      // The Set does not exist
      return null;
    }
    return await this.redis.sMembers('session_activities');
  }

  getManySessionActivitiesByIds(ids: string[]): Promise<(SessionActivity | Error | null)[]> {
    return this.sessionActivityLoader.loadMany(ids);
  }

  getSessionActivityIdsBySessionId(sessionId: string): Promise<string[]> {
    return this.redis.sMembers(
        "session:" + sessionId + "associated_session_activity_ids"
    );
  }

  getSessionActivityById(id: string): Promise<SessionActivity | null> {
    return this.sessionActivityLoader.load(id);
  }
  //endregion

}
