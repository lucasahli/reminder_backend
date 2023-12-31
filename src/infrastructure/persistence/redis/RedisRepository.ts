import { createClient, RedisClientType } from "redis";
import { LoginRepository } from "../../../core/portsAndInterfaces/interfaces/LoginRepository.js";
import { UserRepository } from "../../../core/portsAndInterfaces/interfaces/UserRepository.js";
import { ReminderRepository } from "../../../core/portsAndInterfaces/interfaces/ReminderRepository.js";
import { Login } from "../../../core/components/reminderContext/domain/entities/Login.js";
import { Reminder } from "../../../core/components/reminderContext/domain/entities/Reminder.js";
import { User } from "../../../core/components/reminderContext/domain/entities/User.js";
import { UserRole } from "../../../core/sharedKernel/UserRole.js";
import DataLoader from "dataloader";
import {LocationWithRadius} from "../../../core/components/reminderContext/domain/entities/index.js";
import {ReminderService} from "../../../core/components/reminderContext/application/services/index.js";
import user from "../../../presentation/graphQL/resolvers/user.js";


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
  implements LoginRepository, UserRepository, ReminderRepository
{
  redis: RedisClientType;
  userLoader: DataLoader<string, User | null>
  reminderLoader: DataLoader<string, Reminder | null>

  constructor(redisHost: string | null, redisPort: string | null) {
    const redisUrl =
      `redis://${redisHost}:${redisPort}` || "redis://localhost:6379";
    this.redis = createClient({ url: redisUrl });
    this.redis.on("error", (err) => console.log("Redis Client Error", err));
    this.redis.connect().then(() => console.log("Redis connected"));

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

  }

  async connect() {
    await this.redis.connect();
  }

  //
  // Login CRUD
  //
  async createLogin(
    email: string,
    password: string,
    associatedUserIds: string[],
  ): Promise<Login> {
    // Check if Login already exists
    if (await this.redis.hGet("logins", email)) {
      return Promise.reject("Login with that email already exists!");
    }
    // Generate Login-ID
    const loginId = await this.redis.incr("next_login_id");
    const created = new Date(Date.now());
    // Generate Authentication Secret
    const authsecret = generateRandomStringWithLength(16);
    // Store the login data
    await this.redis.hSet("logins", email, loginId);
    await this.redis.hSet("login:" + loginId.toString(), [
      ...Object.entries({
        email: email,
        password: password,
        auth: authsecret,
        created: created.toISOString(),
        modified: created.toISOString()
      }).flat(),
    ]);
    // Store the Authentication Secret
    await this.redis.hSet("auths", authsecret, loginId);
    // If available, store the associated User-ID's
    if (associatedUserIds.length > 0) {
      await this.redis.sAdd(
        "login:" + loginId.toString() + "associated_user_ids",
        associatedUserIds
      );
    }
    // Return the Login Object
    return Promise.resolve(
      new Login(loginId.toString(), created, created, email, password, associatedUserIds)
    );
  }

  getAllLoginIds(): Promise<string[]> {
    return Promise.resolve([]);
  }

  async getLoginByEmail(email: string): Promise<Login | null> {
    const loginId = await this.redis.hGet("logins", email);
    if (!loginId) {
      console.log(`No login with that email (${email}) in redis!!!`);
      return null;
    }

    const loginData = await this.redis.hGetAll("login:" + loginId);
    const associatedUserIds = await this.redis.sMembers(
        "login:" + loginId + "associated_user_ids"
    );

    if(loginData && associatedUserIds){
      return new Login(
          loginId,
          new Date(loginData.created),
          new Date(loginData.modified),
          loginData.email,
          loginData.password,
          associatedUserIds
      );
    }
    return null;
  }

  getLoginById(id: string): Promise<Login | null> {
    return new Promise<Login | null>(async (resolve, reject) => {
      //   const loginData = await this.redis.hGetAll("login:" + id);
      //   const associatedUserIds = await this.redis.sMembers(
      //     "login:" + id + "associated_user_ids"
      //   );
      //   if (loginData && associatedUserIds) {
      //     console.log("Login Data: ", loginData);
      //     return resolve(
      //       new Login(id, loginData.email, loginData.password, associatedUserIds)
      //     );
      //   } else {
      //     console.log("No login data found in redis for id: ", id);
      //     return resolve(null);
      //   }

      return await Promise.all([
        this.redis.hGetAll("login:" + id),
        this.redis.sMembers("login:" + id + "associated_user_ids"),
      ])
          .then((results) => {
            if(id === undefined || results[0].email === undefined || results[0].password === undefined){
              return resolve(null);
            }
            else {
              return resolve(new Login(id, new Date(results[0].created), new Date(results[0].modified), results[0].email, results[0].password, results[1]));
            }
          })
          .catch((reason) => {
            console.log("Reason: ", reason);
            return resolve(null);
          });
    });
  }

  async deleteLogin(id: string): Promise<boolean> {
    const loginData = await this.redis.hGetAll("login:" + id);
    if (!loginData) {
      return Promise.reject("No login found with id: " + id);
    }
    // await this.redis.hSet("logins", email, loginId);
    await this.redis.hDel("logins", loginData.email);
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

  //
  // User CRUD
  //
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

  //
  // Reminder CRUD
  //
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
          "user:" + userToRemindId + "reminderSubscriptions",
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
            "user:" + userToRemindId + "reminderSubscriptions",
            reminder.id
        );
      }
      for (const userToRemindId of reminder.idsOfUsersToRemind){
        await this.redis.sAdd(
            "user:" + userToRemindId + "reminderSubscriptions",
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
            "user:" + userToRemindId + "reminderSubscriptions",
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

}
