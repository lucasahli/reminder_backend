
export class Login {

    constructor(
        public id: string,
        public created: Date,
        public modified: Date,
        public email: string,
        public password: string,
        public associatedUserIds: string[],
        public associatedDeviceIds: string[],
        public associatedSessionIds: string[]
    ) {}

    // Method to get a JSON representation of the reminder
    toJSON(): Record<string, any> {
        return {
            id: this.id,
            created: this.created.toISOString(),
            modified: this.modified.toISOString(),
            email: this.email,
            password: this.password,
            associatedUserIds: JSON.stringify(this.associatedUserIds),
            associatedDeviceIds: JSON.stringify(this.associatedDeviceIds),
            associatedSessionIds: JSON.stringify(this.associatedSessionIds)
        };
    }

    // Static method to create a Reminder from a JSON object
    static fromJSON(data: Record<string, any>): Login {
        return new Login(
            data.id,
            new Date(data.created),
            new Date(data.modified),
            data.email,
            data.password,
            JSON.parse(data.associatedUserIds),
            JSON.parse(data.associatedDeviceIds),
            JSON.parse(data.associatedSessionIds)
        );
    }

    static isValidLoginData(data: {[p: string]: string}): boolean {
        // Check if all required properties exist
        if(
            data.id &&
            data.created &&
            data.modified &&
            data.email &&
            data.password &&
            data.associatedUserIds &&
            data.associatedDeviceIds &&
            data.associatedSessionIds
        ){
            // Optional properties are checked here, you can add checks if needed
            return true;
        }
        return false;
    }
}