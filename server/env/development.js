module.exports = {
  "DATABASE_URI": "postgres://localhost:5432/pingpong",
  "SESSION_SECRET": "Optimus Prime is my real dad",
  "TWITTER": {
    "consumerKey": "tjRt8Cuk7reHV6CIU9YT9zQki",
    "consumerSecret": "el7z2EswwOfUWJId0TNQIvpspGugmVTswCZ9EwXVHXcYp0LCJC",
    "callbackUrl": "http://127.0.0.1:1337/auth/twitter/callback"
  },
  "FACEBOOK": {
    "clientID": "022a9ed22485b866ec45b04675c6f421",
    "clientSecret": "6780027c94558965aa6611887c1ca58b",
    "callbackURL": "http://127.0.0.1:1337/auth/facebook/callback"
  },
  "GOOGLE": {
    "clientID": "386877686226-rvhgr7rpobqnscmd9grprr9sbg16h6q0.apps.googleusercontent.com",
    "clientSecret": "ba3nDL_YsL8kMnDO_QLWLVPl",
    "callbackURL": "http://127.0.0.1:1337/auth/google/callback"
  },
  "LOGGING": true
};
