const base64url = require('base64url');
const crypto = require('crypto');

const MS_PER_DAY = 60 * 60 * 24 * 1000;

const args = process.argv.slice(2);
if (args.length != 2) {
    console.log('Usage: tgrgbace-policy-generator.js [HMAC_KEY] [HOSTNAME]');
    process.exit(0);
}

const HMAC_KEY = args[0];
const HOSTNAME = args[1];

let streamerPolicy = JSON.stringify({"url_expire": Date.now() + (60 * MS_PER_DAY) });
let viewerPolicy = JSON.stringify({"url_expire": Date.now() + (265 * MS_PER_DAY) });

console.log("streamer_policy: " + streamerPolicy);
console.log("viewer_policy: " + viewerPolicy);

let streamerPolicyBase64 = base64url(Buffer.from(streamerPolicy, 'utf8'));
let viewerPolicyBase64 = base64url(Buffer.from(viewerPolicy, 'utf8'));

makeAndLogPolicy('webrtc', HMAC_KEY, 'ws://' + HOSTNAME + ":3333/tgrgbace/stream", viewerPolicyBase64);
makeAndLogPolicy('webrtc', HMAC_KEY, 'wss://' + HOSTNAME + ":3334/tgrgbace/stream", viewerPolicyBase64);
makeAndLogPolicy('hls', HMAC_KEY, 'http://' + HOSTNAME + ":8080/tgrgbace/stream/playlist.m3u8", viewerPolicyBase64);
makeAndLogPolicy('hls', HMAC_KEY, 'https://' + HOSTNAME + ":8090/tgrgbace/stream/playlist.m3u8", viewerPolicyBase64);
makeAndLogPolicy('dash-ll', HMAC_KEY, 'http://' + HOSTNAME + ":8080/tgrgbace/stream/manifest_ll.mpd", viewerPolicyBase64);
makeAndLogPolicy('dash-ll', HMAC_KEY, 'https://' + HOSTNAME + ":8090/tgrgbace/stream/manifest_ll.mpd", viewerPolicyBase64);

makeAndLogPolicy('rtmp', HMAC_KEY, 'rtmp://' + HOSTNAME + ":1935/tgrgbace/stream", streamerPolicyBase64);
makeAndLogPolicy('srt', HMAC_KEY, 'srt://' + HOSTNAME + ":9999/tgrgbace/stream", streamerPolicyBase64);


function makeAndLogPolicy(protocol, hmacKey, baseUrl, policyBase64) {
    var policyUrl = baseUrl + '?policy=' + policyBase64;
    var signature = base64url(crypto.createHmac('sha1', hmacKey).update(policyUrl).digest());
    var signedUrl = policyUrl + '&signature=' + signature;
    //srt is real special
    if (protocol == "srt") {
        console.log('Protocol: ' + protocol);
        console.log('Url: ' + "srt://" + HOSTNAME + ":9999?streamid=" + encodeURIComponent(signedUrl));
    } else {
        console.log('Protocol: ' + protocol);
        console.log('Url: ' + signedUrl);
        console.log();
    }
}




