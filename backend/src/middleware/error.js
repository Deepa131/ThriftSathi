function errorHandler(err, req, res, next) {
	if (res.headersSent) return next(err);

	const statusCode = err.statusCode || err.status || 500;
	const message = err.message || "Internal server error";

	res.status(statusCode).json({
		success: false,
		message,
	});
}

module.exports = { errorHandler };
