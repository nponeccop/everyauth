/**
 * Created by blairanderson on 7/22/14.
 */

var oauthModule = require('./oauth2'),
    url = require('url'),
    request = require('request');

module.exports = oauthModule.submodule('eventbrite')
  .oauthHost('https://www.eventbrite.com')
  .apiHost('https://www.eventbriteapi.com/v3')

  .entryPath('/eventbrite/auth')
  .callbackPath('/eventbrite/auth/callback')

  .authPath('/oauth/authorize')
  .authQueryParam('response_type', 'code')

  .accessTokenPath('/oauth/token')
  .accessTokenHttpMethod('post')
  .postAccessTokenParamsVia('data')
  .accessTokenParam('grant_type', 'authorization_code')

  .authCallbackDidErr(function (req) {
    var parsedUrl = url.parse(req.url, true);
    return parsedUrl.query.error ? true : false;
  })

  .fetchOAuthUser(function (oauthToken, data) {
    var promise = this.Promise();

    var userUrl = this.apiHost() + '/users/me/';
    var queryParams = { token: oauthToken, format: "json" };

    request.get({ url: userUrl, qs: queryParams}, function (err, res, body) {
      if (err) {
        err.extra = {res: res, data: body};
        return promise.fail(err);
      }
      if (parseInt(res.statusCode / 100, 10) !== 2) {
        return promise.fail({data: body, res: res});
      }
      return promise.fulfill(JSON.parse(body));
    });
    return promise;
  })
