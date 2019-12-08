const { hasOwnProperty } = Object.prototype;

const Status = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNSUPPORTED_ACTION: 405,
  VALIDATION_FAILED: 422,
  SERVER_ERROR: 500,
  CREATED: 201
};
const jsonResponse = (res, body, options = undefined) => {
  res.status(options.status || Status.OK).json(body || null);
};
const meta = (req, res, source, responseTime) => ({
  "x-trans-id": req.get("x-trans-id"),
  "x-trans-parent-id": req.get("x-trans-parent-id"),
  "x-request-or-lang": req.get("x-request-or-lang") || "en",
  source: source,
  "response-time": responseTime
});

const formatError = error => {
  return Array.isArray(error) ? error : [error];
};

const Api = {
  success: (req, res, data, source, status, startHrTime) => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;
    const response = {
      meta: meta(req, res, source, elapsedTimeInMs),
      response: data
    };
    jsonResponse(res, response, {
      status: status
    });
  },
  error: (req, res, error, source, status, startHrTime) => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;
    const response = {
      meta: meta(req, res, source, elapsedTimeInMs),
      exception: formatError(error)
    };
    jsonResponse(res, response, {
      status: status
    });
  },

  requireParams(req, res, params, next) {
    const missing = [];

    (Array.isArray(params) ? params : [params]).forEach(param => {
      if (
        !(req.body && hasOwnProperty.call(req.body, param)) &&
        !(req.params && hasOwnProperty.call(req.params, param)) &&
        !hasOwnProperty.call(req.query, param)
      ) {
        missing.push(`Missing required parameter: ${param}`);
      }
    });

    if (missing.length) {
      Api.badRequest(req, res, missing);
    } else {
      next();
    }
  },
  requireHeaders(req, res, headers, next) {
    const missing = [];
    (Array.isArray(headers) ? headers : [headers]).forEach(header => {
      if (!(req.headers && hasOwnProperty.call(req.headers, header))) {
        missing.push(`Missing required header parameter: ${header}`);
      }
    });

    if (missing.length) {
      Api.badRequest(req, res, missing);
    } else {
      next();
    }
  }
};

const AppResponse = (source = "") => {
  return (req, res, next) => {
    const startHrTime = process.hrtime();
    res.ok = data => {
      return Api.success(req, res, data, source, Status.OK, startHrTime);
    };
    res.serverError = error => {
      return Api.error(
        req,
        res,
        error,
        source,
        Status.SERVER_ERROR,
        startHrTime
      );
    };
    res.notFound = data => {
      return Api.error(req, res, data, source, Status.NOT_FOUND, startHrTime);
    };
    res.badRequest = error => {
      return Api.error(
        req,
        res,
        error,
        source,
        Status.BAD_REQUEST,
        startHrTime
      );
    };
    res.invalid = error => {
      return Api.error(
        req,
        res,
        error,
        source,
        Status.VALIDATION_FAILED,
        startHrTime
      );
    };
    res.unsupportedAction = data => {
      return Api.error(
        req,
        res,
        data,
        source,
        Status.UNSUPPORTED_ACTION,
        startHrTime
      );
    };
    res.forbidden = error => {
      return Api.error(req, res, error, source, Status.FORBIDDEN, startHrTime);
    };
    res.unauthorized = data => {
      return Api.error(
        req,
        res,
        data,
        source,
        Status.UNAUTHORIZED,
        startHrTime
      );
    };
    res.created = data => {
      return Api.success(req, res, data, source, Status.CREATED, startHrTime);
    };
    next();
  };
};
module.exports = AppResponse;
