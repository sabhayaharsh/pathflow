const ResponseHelper = require('../../helpers/responseHelper');
const decisionPillarModel = require('../../models/backend/decisionPillarModel');

class DecisionPillarController {

    async getOpportunityIDWise(req, res) {
        try {
            const opportunityId = req.params.id;

            const data = await decisionPillarModel.GetOpportunityIdWise(opportunityId);

            if (!data || data.length === 0) {
                return ResponseHelper.respond(404, false, null, 'Data not found!', res);
            }

            // Extract the object from the array if it's wrapped in one
            const responseData = Array.isArray(data) ? data[0] : data;

            return ResponseHelper.respond(200, true, responseData, 'Successfully retrieved opportunity data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }
    
    async getCreatedOpportunityDetails(req, res) {
        const { start, size, filters, globalFilter, sorting } = req.query; // Extract query parameters
        const page = Math.floor(start / size) + 1; // Calculate page based on start and size
        const parsedFilters = filters ? JSON.parse(filters) : [];
        const parsedSortings = sorting ? JSON.parse(sorting) : [];

        try {
            const opportunities = await decisionPillarModel.fetchALLCreatedOpportunityDetails(page, size, parsedFilters, globalFilter, parsedSortings, 2);

            return ResponseHelper.respond(200, true, {
                opportunities
            }, 'Successfully retrieved opportunities data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getOpportunityAllTasks(req, res) {
        const { start, size, filters, globalFilter, sorting } = req.query; // Extract query parameters
        const page = Math.floor(start / size) + 1; // Calculate page based on start and size
        const parsedFilters = filters ? JSON.parse(filters) : [];
        const parsedSortings = sorting ? JSON.parse(sorting) : [];

        try {
            const tasks = await decisionPillarModel.fetchALLOpportunityAllTasks(page, size, parsedFilters, globalFilter, parsedSortings, 2);

            return ResponseHelper.respond(200, true, {
                tasks
            }, 'Successfully retrieved opportunities all task.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }
    
}

module.exports = new DecisionPillarController();