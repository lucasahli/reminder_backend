import {Viewer} from "../../../sharedKernel/Viewer.js";
import {ReminderUseCase} from "../../../portsAndInterfaces/ports/ReminderUseCase.js";
import {Reminder} from "../domain/entities/Reminder.js";
import {ReminderService} from "../domain/services/ReminderService.js";
import {Error} from "sequelize";

export class ReminderUseCaseHandler implements ReminderUseCase {
    private reminderService: ReminderService;

    constructor(service: ReminderService) {
        this.reminderService = service;
    }

    getReminderById(viewer: Viewer, id: string): Promise<Reminder | null> {
        return this.reminderService.generate(viewer, id);
    }

    createReminder(viewer: Viewer, title: string, dateTimeToRemind: Date): Promise<Reminder | null> {
        return this.reminderService.createReminder(viewer, title, dateTimeToRemind);
    }

    deleteReminderById(viewer: Viewer, id: string): Promise<boolean> {
        return this.reminderService.deleteReminder(viewer, id);
    }

    getRemindersByUser(viewer: Viewer, id: string): Promise<(Reminder | Error | null)[]> {
        return this.reminderService.getRemindersByUserId(viewer, id);
    }

    getAllReminders(viewer: Viewer): Promise<(Reminder | Error | null)[]> {
        return this.reminderService.getAllReminders(viewer);
    }
}