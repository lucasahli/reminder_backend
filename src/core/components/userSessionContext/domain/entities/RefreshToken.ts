import jwt, {JwtPayload} from 'jsonwebtoken';

export class RefreshToken {
    constructor(
        public id: string,
        public created: Date,
        public modified: Date,
        public token: string,
        public expiration: Date,
        public revoked: boolean,
        public associatedLoginId: string,
        public associatedDeviceId: string
        ) {
    }

    toJSON(): Record<string, any> {
        return {
            id: this.id,
            created: this.created.toISOString(),
            modified: this.modified.toISOString(),
            token: this.token,
            expiration: this.expiration.toISOString(),
            revoked: JSON.stringify(this.revoked),
            associatedLoginId: this.associatedLoginId,
            associatedDeviceId: this.associatedDeviceId,
        };
    }

    // Static method to create a Reminder from a JSON object
    static fromJSON(data: Record<string, any>): RefreshToken {
        return new RefreshToken(
            data.id,
            new Date(data.created),
            new Date(data.modified),
            data.token,
            new Date(data.expiration),
            JSON.parse(data.revoked),
            data.associatedLoginId,
            data.associatedDeviceId
        );
    }

    static isValidRefreshTokenData(data: {[p: string]: string}): boolean {
        // Check if all required properties exist
        if(
            data.id &&
            data.created &&
            data.modified &&
            data.token &&
            data.expiration &&
            data.revoked &&
            data.associatedLoginId &&
            data.associatedDeviceId
        ){
            // Optional properties are checked here, you can add checks if needed
            return true;
        }
        return false;
    }

    isTokenValid(): boolean {
        const now = new Date();
        return !this.revoked && this.expiration > now;
    }

    getPayload(): Record<string, any> | null {
        try {
            // Assuming the token is a JWT, decode its payload
            const payload = jwt.decode(this.token, {json: true});
            return payload;
        } catch (error) {
            // Handle the error if the token is not a valid JWT
            console.error('Failed to decode JWT:', error);
            return null;
        }
    }

    revoke() {
        this.revoked = true;
    }

}