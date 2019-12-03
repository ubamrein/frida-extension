import * as https from 'https';
import { IncomingMessage } from 'http';

export class HttpsConnection {
    url : string;
    constructor(url :string){
        this.url = url;
    }

    static followRedirects(url : string, callback : ((response : Buffer) => void)){
        https.get(url, function(resp) {
            if(resp.headers.location){
                //we have a redirect
                HttpsConnection.followRedirects(resp.headers.location!,callback);
            } else {
                var body = Buffer.alloc(Number.parseInt(resp.headers["content-length"]!)!);
                var currentPos =0;
                resp.on('data', function(chunk) {
                    body.set(chunk, currentPos);
                    currentPos += chunk.length;
                });
                resp.on('end', function() {
                  callback(body);
                });
                
            }
        });
    }

    static get(url : string,callback : ((response : Buffer) => void) ) {
        HttpsConnection.followRedirects(url, callback);
    }
}