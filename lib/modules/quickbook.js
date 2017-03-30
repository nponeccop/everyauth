var oauthModule = require('./oauth')
  , OAuth = require('oauth').OAuth;

var quickbook = module.exports =
oauthModule.submodule('quickbook')
  .definit( function () {
    var oauth = this.oauth = new OAuth(
        this.oauthHost() + this.requestTokenPath()
      , this.oauthHost() + this.accessTokenPath()
      , this.consumerKey()
      , this.consumerSecret()
      , '1.0', null, 'HMAC-SHA1');
  })
  .apiHost('https://appcenter.intuit.com')
  .oauthHost('https://oauth.intuit.com/oauth/v1')

  .requestTokenPath('/get_request_token')
  .accessTokenPath('/get_access_token')
  .authorizePath('/Connect/Begin')

  .redirectToProviderAuth( function (res, token) {
    this.redirect(res, 'https://appcenter.intuit.com' + this.authorizePath() + '?oauth_token=' + token);
  })

  .entryPath('/auth/quickbook')
  .callbackPath('/auth/quickbook/callback')

  .fetchOAuthUser( function (accessToken, accessTokenSecret, params) {
    var promise = this.Promise();

    this.oauth.get(this.apiHost() + '/api/v1/user/current?format=json', accessToken, accessTokenSecret, function (err, data) {
      if (err) return promise.fail(err);
      var oauthUser = JSON.parse(data).User;
      oauthUser.accessToken = accessToken;
      oauthUser.accessTokenSecret = accessTokenSecret;
      oauthUser.realmId = params.realmId;
      promise.fulfill(oauthUser);
    });
    return promise;
  });
