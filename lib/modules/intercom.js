var oauthModule = require('./oauth2');
var url = require('url');

module.exports =
oauthModule.submodule('intercom')
  .configurable({
      scope: 'specify types of access: (no scope), user, public_repo, repo, gist'
  })

  .oauthHost('https://app.intercom.io')
  .apiHost('https://api.intercom.io')

  .authPath('/oauth')
  //.authQueryParam('state', 'web_server')

  .accessTokenPath('/auth/eagle/token')
  //.accessTokenParam('state', 'web_server')

  .postAccessTokenParamsVia('data')

  .entryPath('/intercom/auth')
  .callbackPath('/intercom/auth/callback')

  .getCode(function (req, res, next) {
    var parsedUrl = url.parse(req.url, true);
    if (this._authCallbackDidErr(req)) {
      return this.breakTo('authCallbackErrorSteps', req, res, next);
    }

    if (!parsedUrl.query || !parsedUrl.query.code) {
      console.error("Missing access_token in querystring. The url looks like " + req.url);
    }

    return parsedUrl.query;
  })
  .getAccessToken(function (query, data) {
    var p = this.Promise();

    if (!query.code) {
      p.fail(new Error("missing access_token"));
    } else {
      var token = query.code;
      delete query.code;
      p.fulfill(token, query);
    }

    return p;
  })

  .fetchOAuthUser(function (accessToken, data) {
    return accessToken;
  })
  .moduleErrback( function (err, seqValues) {
    if (err instanceof Error) {
      var next = seqValues.next;
      return next(err);
    } else if (err.extra) {
      var _intercomsigResponse = err.extra.res
        , serverResponse = seqValues.res;
      serverResponse.writeHead(
          _intercomsigResponse.statusCode
        , _intercomsigResponse.headers);
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
