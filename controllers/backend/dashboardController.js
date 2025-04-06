const ResponseHelper = require('../../helpers/responseHelper');
const dashboardModel = require('../../models/backend/dashboardModel');

class dashboardController {

    getAdminDashboard = async (req, res) => {
        try {
            // Fetch the recent 5 records for each type
            const AdminDataCount = await dashboardModel.fetchUserCount();

            const result = {
                AdminDataCount
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved admin dashboard.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

}

module.exports = new dashboardController();