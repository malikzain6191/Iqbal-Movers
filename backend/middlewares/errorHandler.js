exports.notFound = (req, res, next) => {
  res.status(404).send({ message: `Route ${req.originalUrl} not found` });
};

// Express recognizes this as an error handler because it takes 4 arguments.
// Any synchronous throw or next(err) call anywhere in the app ends up here.
exports.errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).send({ message: err.message || 'Internal server error' });
};
