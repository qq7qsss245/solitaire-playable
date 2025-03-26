"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
function default_1() {
    var win = window;
    var mraid = window.mraid;
    var _a = (win.MRAID_ENV || {}).sdk, sdk = _a === void 0 ? "" : _a;
    var iosLink = "https://apps.apple.com/us/app/solitaire-card-games-classic/id1564391515";
    var androidLink = "https://play.google.com/store/apps/details?id=solitaire.patience.card.games.klondike.free";
    var isUnity = /unity/i.test(sdk);
    var isIOS = /iPad|iPhone|iPod|Macintosh|Mac OS/i.test(navigator.userAgent) &&
        !win.MSStream;
    var link = isIOS ? iosLink : androidLink;
    ;
    if (win.dapi && win.dapi.openStoreUrl) { //IRONSOURCE & APPGROWTH
        win.dapi.openStoreUrl();
    }
    else if (win.FbPlayableAd) { // FACEBOOK
        win.FbPlayableAd.onCTAClick();
    }
    else if (win.callSDK) {
        win.callSDK("download");
    }
    else if (win.ExitApi) { // GOOGLE
        win.ExitApi();
        win.ExitApi.exit && win.ExitApi.exit();
    }
    else if (win.install) { //MINTEGRAL
        win.install();
        win.gameEnd && win.gameEnd();
    }
    else if (win.playableSDK && win.playableSDK.openAppStore) { // TIKTOK
        win.playableSDK.openAppStore();
    }
    else if (typeof mraid !== 'undefined' && mraid.open) { // mraid by default
        mraid.open(isUnity ? link : undefined);
    }
    else {
        win.open(link);
    }
}
