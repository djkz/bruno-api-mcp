import ohm from "ohm-js";
import _ from "lodash";
import { outdentString } from "../bruno-utils.js";

const grammar = ohm.grammar(`Bru {
  BruFile = (meta | query | headers | auth | auths | vars | script | tests | docs)*
  auths = authawsv4 | authbasic | authbearer | authdigest | authNTLM |authOAuth2 | authwsse | authapikey

  nl = "\\r"? "\\n"
  st = " " | "\\t"
  stnl = st | nl
  tagend = nl "}"
  optionalnl = ~tagend nl
  keychar = ~(tagend | st | nl | ":") any
  valuechar = ~(nl | tagend) any

  // Dictionary Blocks
  dictionary = st* "{" pairlist? tagend
  pairlist = optionalnl* pair (~tagend stnl* pair)* (~tagend space)*
  pair = st* key st* ":" st* value st*
  key = keychar*
  value = valuechar*

  // Text Blocks
  textblock = textline (~tagend nl textline)*
  textline = textchar*
  textchar = ~nl any
  
  meta = "meta" dictionary

  auth = "auth" dictionary

  headers = "headers" dictionary

  query = "query" dictionary

  vars = varsreq | varsres
  varsreq = "vars:pre-request" dictionary
  varsres = "vars:post-response" dictionary

  authawsv4 = "auth:awsv4" dictionary
  authbasic = "auth:basic" dictionary
  authbearer = "auth:bearer" dictionary
  authdigest = "auth:digest" dictionary
  authNTLM = "auth:ntlm" dictionary
  authOAuth2 = "auth:oauth2" dictionary
  authwsse = "auth:wsse" dictionary
  authapikey = "auth:apikey" dictionary

  script = scriptreq | scriptres
  scriptreq = "script:pre-request" st* "{" nl* textblock tagend
  scriptres = "script:post-response" st* "{" nl* textblock tagend
  tests = "tests" st* "{" nl* textblock tagend
  docs = "docs" st* "{" nl* textblock tagend
}`);

const mapPairListToKeyValPairs = (pairList = [], parseEnabled = true) => {
  if (!pairList.length) {
    return [];
  }
  return _.map(pairList[0], (pair) => {
    let name = _.keys(pair)[0];
    let value = pair[name];

    if (!parseEnabled) {
      return {
        name,
        value,
      };
    }

    let enabled = true;
    if (name && name.length && name.charAt(0) === "~") {
      name = name.slice(1);
      enabled = false;
    }

    return {
      name,
      value,
      enabled,
    };
  });
};

const concatArrays = (objValue, srcValue) => {
  if (_.isArray(objValue) && _.isArray(srcValue)) {
    return objValue.concat(srcValue);
  }
};

const mapPairListToKeyValPair = (pairList = []) => {
  if (!pairList || !pairList.length) {
    return {};
  }

  return _.merge({}, ...pairList[0]);
};

const sem = grammar.createSemantics().addAttribute("ast", {
  BruFile(tags) {
    if (!tags || !tags.ast || !tags.ast.length) {
      return {};
    }

    return _.reduce(
      tags.ast,
      (result, item) => {
        return _.mergeWith(result, item, concatArrays);
      },
      {}
    );
  },
  dictionary(_1, _2, pairlist, _3) {
    return pairlist.ast;
  },
  pairlist(_1, pair, _2, rest, _3) {
    return [pair.ast, ...rest.ast];
  },
  pair(_1, key, _2, _3, _4, value, _5) {
    let res = {};
    res[key.ast] = value.ast ? value.ast.trim() : "";
    return res;
  },
  key(chars) {
    return chars.sourceString ? chars.sourceString.trim() : "";
  },
  value(chars) {
    return chars.sourceString ? chars.sourceString.trim() : "";
  },
  textblock(line, _1, rest) {
    return [line.ast, ...rest.ast].join("\n");
  },
  textline(chars) {
    return chars.sourceString;
  },
  textchar(char) {
    return char.sourceString;
  },
  nl(_1, _2) {
    return "";
  },
  st(_) {
    return "";
  },
  tagend(_1, _2) {
    return "";
  },
  _iter(...elements) {
    return elements.map((e) => e.ast);
  },
  meta(_1, dictionary) {
    let meta = mapPairListToKeyValPair(dictionary.ast) || {};

    meta.type = "collection";

    return {
      meta,
    };
  },
  auth(_1, dictionary) {
    let auth = mapPairListToKeyValPair(dictionary.ast) || {};

    return {
      auth: {
        mode: auth ? auth.mode : "none",
      },
    };
  },
  query(_1, dictionary) {
    return {
      query: mapPairListToKeyValPairs(dictionary.ast),
    };
  },
  headers(_1, dictionary) {
    return {
      headers: mapPairListToKeyValPairs(dictionary.ast),
    };
  },
  authawsv4(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);
    const accessKeyIdKey = _.find(auth, { name: "accessKeyId" });
    const secretAccessKeyKey = _.find(auth, { name: "secretAccessKey" });
    const sessionTokenKey = _.find(auth, { name: "sessionToken" });
    const serviceKey = _.find(auth, { name: "service" });
    const regionKey = _.find(auth, { name: "region" });
    const profileNameKey = _.find(auth, { name: "profileName" });
    const accessKeyId = accessKeyIdKey ? accessKeyIdKey.value : "";
    const secretAccessKey = secretAccessKeyKey ? secretAccessKeyKey.value : "";
    const sessionToken = sessionTokenKey ? sessionTokenKey.value : "";
    const service = serviceKey ? serviceKey.value : "";
    const region = regionKey ? regionKey.value : "";
    const profileName = profileNameKey ? profileNameKey.value : "";
    return {
      auth: {
        awsv4: {
          accessKeyId,
          secretAccessKey,
          sessionToken,
          service,
          region,
          profileName,
        },
      },
    };
  },
  authbasic(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);
    const usernameKey = _.find(auth, { name: "username" });
    const passwordKey = _.find(auth, { name: "password" });
    const username = usernameKey ? usernameKey.value : "";
    const password = passwordKey ? passwordKey.value : "";
    return {
      auth: {
        basic: {
          username,
          password,
        },
      },
    };
  },
  authbearer(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);
    const tokenKey = _.find(auth, { name: "token" });
    const token = tokenKey ? tokenKey.value : "";
    return {
      auth: {
        bearer: {
          token,
        },
      },
    };
  },
  authdigest(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);
    const usernameKey = _.find(auth, { name: "username" });
    const passwordKey = _.find(auth, { name: "password" });
    const username = usernameKey ? usernameKey.value : "";
    const password = passwordKey ? passwordKey.value : "";
    return {
      auth: {
        digest: {
          username,
          password,
        },
      },
    };
  },
  authNTLM(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);
    const usernameKey = _.find(auth, { name: "username" });
    const passwordKey = _.find(auth, { name: "password" });
    const domainKey = _.find(auth, { name: "domain" });
    const workstationKey = _.find(auth, { name: "workstation" });
    const username = usernameKey ? usernameKey.value : "";
    const password = passwordKey ? passwordKey.value : "";
    const domain = domainKey ? domainKey.value : "";
    const workstation = workstationKey ? workstationKey.value : "";
    return {
      auth: {
        ntlm: {
          username,
          password,
          domain,
          workstation,
        },
      },
    };
  },
  authOAuth2(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);

    const findValueByName = (name) => {
      const item = _.find(auth, { name });
      return item ? item.value : "";
    };

    const grantType = findValueByName("grantType");
    const callbackUrl = findValueByName("callbackUrl");
    const authUrl = findValueByName("authUrl");
    const accessTokenUrl = findValueByName("accessTokenUrl");
    const clientId = findValueByName("clientId");
    const clientSecret = findValueByName("clientSecret");
    const scope = findValueByName("scope");
    const password = findValueByName("password");
    const username = findValueByName("username");
    const clientAuthentication = findValueByName("clientAuthentication");
    const pkce = findValueByName("pkce");
    let accessToken = findValueByName("accessToken");
    const token = accessToken ? { access_token: accessToken } : null;

    return {
      auth: {
        oauth2: {
          grantType,
          callbackUrl,
          authUrl,
          accessTokenUrl,
          clientId,
          clientSecret,
          scope,
          username,
          password,
          clientAuthentication,
          pkce,
          token,
        },
      },
    };
  },
  authwsse(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);
    const usernameKey = _.find(auth, { name: "username" });
    const passwordKey = _.find(auth, { name: "password" });
    const username = usernameKey ? usernameKey.value : "";
    const password = passwordKey ? passwordKey.value : "";
    return {
      auth: {
        wsse: {
          username,
          password,
        },
      },
    };
  },
  authapikey(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);

    const findValueByName = (name) => {
      const item = _.find(auth, { name });
      return item ? item.value : "";
    };

    const key = findValueByName("key");
    const value = findValueByName("value");
    const in_ = findValueByName("in");
    const placement = findValueByName("placement");
    const addTo =
      placement === "header" || in_ === "header" ? "header" : "queryParams";

    return {
      auth: {
        apikey: {
          key,
          value,
          in: in_,
          addTo,
        },
      },
    };
  },
  varsreq(_1, dictionary) {
    const vars = mapPairListToKeyValPair(dictionary.ast) || {};
    const varsObject = {};

    // Convert the vars object to key-value pairs
    Object.keys(vars).forEach((key) => {
      varsObject[key] = vars[key];
    });

    return {
      vars: {
        "pre-request": varsObject,
      },
    };
  },
  varsres(_1, dictionary) {
    const vars = mapPairListToKeyValPair(dictionary.ast) || {};
    const varsObject = {};

    // Convert the vars object to key-value pairs
    Object.keys(vars).forEach((key) => {
      varsObject[key] = vars[key];
    });

    return {
      vars: {
        "post-response": varsObject,
      },
    };
  },
  scriptreq(_1, _2, _3, _4, textblock, _5) {
    return {
      script: {
        "pre-request": outdentString(textblock.ast),
      },
    };
  },
  scriptres(_1, _2, _3, _4, textblock, _5) {
    return {
      script: {
        "post-response": outdentString(textblock.ast),
      },
    };
  },
  tests(_1, _2, _3, _4, textblock, _5) {
    return {
      tests: outdentString(textblock.ast),
    };
  },
  docs(_1, _2, _3, _4, textblock, _5) {
    return {
      docs: outdentString(textblock.ast),
    };
  },
});

const parser = (input) => {
  const match = grammar.match(input);

  if (match.succeeded()) {
    return sem(match).ast;
  } else {
    throw new Error(match.message);
  }
};

export default parser;
