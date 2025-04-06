const jwt = require('jsonwebtoken');
const userModel = require('../../models/frontend/userModel');
const ResponseHelper = require('../../helpers/responseHelper');

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return ResponseHelper.respond(401, false, { error: 'Unauthorized' }, null, res);
    }

    try {
        // Decode the token to get user information
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

        // Retrieve user from the database using the user ID from the decoded token
        const user = await userModel.getUserByEmail(decodedToken.email);
        //console.log("user",user);
        // Check if the stored token matches the token from the request
        if (user && user.token !== token) {
            return ResponseHelper.respond(401, false, { error: 'Unauthorized' }, null, res);
        }
        if (user && user.status === "3") {
            return ResponseHelper.respond(401, false, { error: 'Account is deactive. Please contact the admin to resolve this issue.' }, null, res);
        }

        // Attach the user information to the request for later use
        req.user = user;
        next();
    } catch (error) {
        // Handle token verification errors
        console.error(error);
        return ResponseHelper.respond(401, false, { error: 'Unauthorized' }, null, res);
    }
}

module.exports = authenticateToken;
