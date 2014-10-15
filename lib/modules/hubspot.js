var oauthModule = require('./oauth2');
var url = require('url');
var request = require('request');
var querystring = require('querystring');
var extractHostname = require('../utils').extractHostname;

var hubspot = module.exports = oauthModule
  .submodule('hubspot')
  .configurable({
    appId: 'API key in your App Info',
    appSecret: 'Shared Secret from your App Info',
    portalId: 'the hubspot portal ID of the customer re-directing',
    scope: 'types of access. See Shopify API docs for scopes available. Expects "read_products,write_themes"'
  })

  .entryPath('/auth/hubspot')

  .callbackPath('/auth/hubspot/callback')

  .oauthHost('https://app.hubspot.com')

  .apiHost('https://api.hubapi.com')

  .authPath('https://app.hubspot.com/auth/authenticate')
  .getAuthUri(function (req, res, next) {
    /**
     * WE OVERWRITE getAuthUri because hubspot is stupid.
     * HUBSPOT requires '+' separators in the scope,
     * everyauth/oauth/lib uses querystring stringify params
     * stringifying converts '+' to %20
     */

    // Automatic hostname detection + assignment
    if (!this._myHostname || this._alwaysDetectHostname) {
      this.myHostname(extractHostname(req));
    }

    if (!this._appId){
      return new Error('Missing Client_ID');
    }

    var redirect_uri = this._myHostname + this._callbackPath;
    if(!redirect_uri) {
      console.log("redirect_uri", redirect_uri);
      return new Error(redirect_uri);
    }

    if (!this._portalId){
      return new Error('Missing Portal_ID');
    }

    var params = {
      client_id: this._appId,
      redirect_uri: redirect_uri,
      portalId: this._portalId
    };

    var authUri = this._authPath + '?' + querystring.stringify(params) + "&scope=" + this._scope;
    return authUri;
  })

  .getCode(function (req, res, next) {
    // hubspot immediately provides the access_token and refresh_token
    var parsedUrl = url.parse(req.url, true);
    if (this._authCallbackDidErr(req)) {
      return this.breakTo('authCallbackErrorSteps', req, res, next);
    }

    if (!parsedUrl.query || !parsedUrl.query.access_token || !parsedUrl.query.refresh_token) {
      console.error("Missing access_token in querystring. The url looks like " + req.url);
    }

    return parsedUrl.query;
  })
  .getAccessToken(function (query, data) {
    var p = this.Promise();

    // POTENTIALLY REFRESH THE TOKEN?
    if (!query.access_token || !query.refresh_token) {
      p.fail(new Error("missing access_token"));
    } else {
      var token = query.access_token;
      delete query.access_token;
      p.fulfill(token, query);
    }

    return p;
  })

  .fetchOAuthUser(function (accessToken, data) {
    return accessToken;
  })

  .moduleErrback(function (err, seqValues) {
    var hubspotResponse;
    var serverResponse;

    if (err instanceof Error) {
      var next = seqValues.next;
      return next(err);
    } else if (err.extra) {
      hubspotResponse = err.extra.res;
      serverResponse = seqValues.res;
      serverResponse.writeHead(hubspotResponse.statusCode, hubspotResponse.headers);
      serverResponse.end(err.extra.data);

    } else if (err.statusCode) {
      serverResponse = seqValues.res;
      serverResponse.writeHead(err.statusCode);
      serverResponse.end(err.data);

    } else {
      throw new Error('Unsupported error type');
    }
  });
