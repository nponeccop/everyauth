/**
 * Created by blairanderson on 7/22/14.
 */

var oauthModule = require('./oauth2');
var request = require('request');

module.exports = oauthModule.submodule('eventbrite')
  .apiHost('https://www.eventbriteapi.com/v3')
  .oauthHost('https://www.eventbrite.com')

  .authPath('/oauth/authorize')
  .accessTokenPath('/oauth/token')

  .entryPath('/auth/eventbrite')
  .callbackPath('/auth/eventbrite/callback')

  .authQueryParam('response_type', 'code')
  .accessTokenParam('grant_type', 'authorization_code')

  .fetchOAuthUser(function (oauthToken) {
    var promise = this.Promise();
    var userUrl = this.apiHost() + '/users/me';
    var queryParams = { token: oauthToken };

    request.get({ url: userUrl, qs: queryParams}, function (err, res, body) {
      var statusCode = parseInt(res.statusCode);

      if (err) {
        err.extra = {res: res, data: body};
        return promise.fail(err);
      }
      if (statusCode > 299) {
        return promise.fail({extra: {data: body, res: res}});
      }
      var oauthUser = JSON.parse(body).response;
      return promise.fulfill(oauthUser);
    });
    return promise;
  })
  .moduleErrback(function (err, seqValues) {
    if (err instanceof Error) {
      var next = seqValues.next;
      return next(err);

    } else if (err.extra) {
      var ebResponse = err.extra.res;
      var serverResponse = seqValues.res;

      serverResponse.writeHead(ebResponse.statusCode,ebResponse.headers);
      serverResponse.end(err.extra.data);

    } else if (err.statusCode) {
      var serverResponse = seqValues.res;
      serverResponse.writeHead(err.statusCode);
      serverResponse.end(err.data);
    } else {
      console.error(err);
      throw new Error('Unsupported error type');
    }
  });
