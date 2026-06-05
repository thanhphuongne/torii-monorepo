export interface TokenPayload {
    sub: string; // user ID
    sid?: string; // session ID
    role?: string;
    permissions?: string[];

    // Metadata claims
    app_metadata?: {
        provider?: string;
        [key: string]: any;
    };
    user_metadata?: {
        displayName?: string;
        avatarUrl?: string;
        [key: string]: any;
    };

    // Auth context claims
    amr?: string[]; // Authentication Methods Reference (e.g., ['password', 'totp'])

    // Standard claims
    jti?: string;
    exp?: number;
    iat?: number;
    nbf?: number;
    aud?: string;
    iss?: string;
}

export interface Requester extends TokenPayload { }
