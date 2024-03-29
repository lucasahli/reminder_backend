import {IncomingHttpHeaders} from "http";

export class MockHeaders implements IncomingHttpHeaders {
    [key: string]: string | string[] | undefined;

    "accept-language": string | undefined;
    "accept-patch": string | undefined;
    "accept-ranges": string | undefined;
    "access-control-allow-credentials": string | undefined;
    "access-control-allow-headers": string | undefined;
    "access-control-allow-methods": string | undefined;
    "access-control-allow-origin": string | undefined;
    "access-control-expose-headers": string | undefined;
    "access-control-max-age": string | undefined;
    "access-control-request-headers": string | undefined;
    "access-control-request-method": string | undefined;
    "alt-svc": string | undefined;
    "cache-control": string | undefined;
    "content-disposition": string | undefined;
    "content-encoding": string | undefined;
    "content-language": string | undefined;
    "content-length": string | undefined;
    "content-location": string | undefined;
    "content-range": string | undefined;
    "content-type": string | undefined;
    "if-match": string | undefined;
    "if-modified-since": string | undefined;
    "if-none-match": string | undefined;
    "if-unmodified-since": string | undefined;
    "last-modified": string | undefined;
    "proxy-authenticate": string | undefined;
    "proxy-authorization": string | undefined;
    "public-key-pins": string | undefined;
    "retry-after": string | undefined;
    "sec-websocket-accept": string | undefined;
    "sec-websocket-extensions": string | undefined;
    "sec-websocket-key": string | undefined;
    "sec-websocket-protocol": string | undefined;
    "sec-websocket-version": string | undefined;
    "set-cookie": string[] | undefined;
    "strict-transport-security": string | undefined;
    "transfer-encoding": string | undefined;
    "user-agent": string | undefined;
    "www-authenticate": string | undefined;
    accept: string | undefined;
    age: string | undefined;
    allow: string | undefined;
    authorization: string | undefined;
    connection: string | undefined;
    cookie: string | undefined;
    date: string | undefined;
    etag: string | undefined;
    expect: string | undefined;
    expires: string | undefined;
    forwarded: string | undefined;
    from: string | undefined;
    host: string | undefined;
    location: string | undefined;
    origin: string | undefined;
    pragma: string | undefined;
    range: string | undefined;
    referer: string | undefined;
    tk: string | undefined;
    trailer: string | undefined;
    upgrade: string | undefined;
    vary: string | undefined;
    via: string | undefined;
    warning: string | undefined;

    constructor(authorization: string | undefined, userAgent: string | undefined) {
        this.authorization = authorization;
        this["user-agent"] = userAgent;
    }

}