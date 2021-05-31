const base64url = require('base64url');
const crypto = require('crypto');
const fs = require('fs');
var CryptoJS = require('crypto-js');


const MS_PER_DAY = 60 * 60 * 24 * 1000;

const args = process.argv.slice(2);
if (args.length != 3) {
    console.log('Usage: tgrgbace-policy-generator.js [HMAC_KEY] [HOSTNAME] [SOURCES_FILE]');
    process.exit(0);
}

const HMAC_KEY = args[0];
const HOSTNAME = args[1];
const SOURCES = args[2];

let streamerPolicy = JSON.stringify({"url_expire": Date.now() + (60 * MS_PER_DAY) });
let viewerPolicy = JSON.stringify({"url_expire": Date.now() + (265 * MS_PER_DAY) });

console.log("streamer_policy: " + streamerPolicy);
console.log("viewer_policy: " + viewerPolicy);

let streamerPolicyBase64 = base64url(Buffer.from(streamerPolicy, 'utf8'));
let viewerPolicyBase64 = base64url(Buffer.from(viewerPolicy, 'utf8'));

var policies = {};
//makeAndLogPolicy(policies, 'webrtc', HMAC_KEY, 'ws://' + HOSTNAME + ":3333/tgrgbace/stream", viewerPolicyBase64);
makePolicy(policies, 'webrtc', HMAC_KEY, 'wss://' + HOSTNAME + ":3334/tgrgbace/stream", viewerPolicyBase64);
//makeAndLogPolicy('hls', HMAC_KEY, 'http://' + HOSTNAME + ":8080/tgrgbace/stream/playlist.m3u8", viewerPolicyBase64);
makePolicy(policies, 'hls', HMAC_KEY, 'https://' + HOSTNAME + ":8090/tgrgbace/stream/playlist.m3u8", viewerPolicyBase64);
//makePolicy('dash-ll', HMAC_KEY, 'http://' + HOSTNAME + ":8080/tgrgbace/stream/manifest_ll.mpd", viewerPolicyBase64);
makePolicy(policies, 'dash-ll', HMAC_KEY, 'https://' + HOSTNAME + ":8090/tgrgbace/stream/manifest_ll.mpd", viewerPolicyBase64);

var streamerPolicies = {};
makePolicy(streamerPolicies, 'rtmp', HMAC_KEY, 'rtmp://' + HOSTNAME + ":1935/tgrgbace/stream", streamerPolicyBase64);
makePolicy(streamerPolicies, 'srt', HMAC_KEY, 'srt://' + HOSTNAME + ":9999/tgrgbace/stream", streamerPolicyBase64);

for (const [key, value] of Object.values(policies)) {
    console.log("Protocol: " + key);
    console.log("Url: " + value);
    console.log();
}
console.log();

for (const [key, value] of Object.entries(streamerPolicies)) {
    console.log("Protocol: " + key);
    console.log("Url: " + value);
    console.log();
}

var sourcesObject = Object.entries(policies).map(function([key, value]) {
    console.log(key);
    console.log(value);
    var entry = {
        "type": key,
        "file": value,
        "label": key
    };

    if (key === "webrtc") {
        entry["default"] = true;
    }

    return entry;
});

var sourcesString = JSON.stringify(sourcesObject); 
var sourcesKey = crypto.randomBytes(32).toString('base64');
var encrypted = CryptoJS.AES.encrypt(sourcesString, sourcesKey).toString();
var sourcesJs = 
    'function getSources(key) {\n' +
    '\tvar str = CryptoJS.AES.decrypt(\'' + encrypted + '\', key).toString(CryptoJS.enc.Utf8);\n' +
    '\treturn JSON.parse(str);\n'+
    '}\n';



console.log();
console.log('Url with key: https://' + HOSTNAME + '/tgrgbace/index.html?key=' + sourcesKey);


fs.writeFile(SOURCES, sourcesJs, err => {
    if (err) {
        console.error(err);
        return;
    }
});


function makePolicy(policies, protocol, hmacKey, baseUrl, policyBase64) {
    var policyUrl = baseUrl + '?policy=' + policyBase64;
    var signature = base64url(crypto.createHmac('sha1', hmacKey).update(policyUrl).digest());
    var signedUrl = policyUrl + '&signature=' + signature;
    //srt is real special
    if (protocol == "srt") {
        policies[protocol] = "srt://" + HOSTNAME + ":9999?streamid=" + encodeURIComponent(signedUrl);
    } else {
        policies[protocol] = signedUrl;
    }
}




