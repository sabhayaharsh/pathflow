const ResponseHelper = require('../../helpers/responseHelper');
const awarenessPillarModel = require('../../models/backend/awarenessPillarModel');

class AwarenessPillarController {

      // get Experience User Wise
      async getObservationIDWise(req, res) {
        try {
            const observationId = req.params.id;

            const data = await awarenessPillarModel.GetObservationIdWise(observationId);

            if (!data || data.length === 0) {
                return ResponseHelper.respond(404, false, null, 'Data not found!', res);
            }

            // Extract the object from the array if it's wrapped in one
            const observationData = Array.isArray(data) ? data[0] : data;

            return ResponseHelper.respond(200, true, observationData, 'Successfully retrieved observation data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getCreatedObservationDetails(req, res) {
        const { start, size, filters, globalFilter, sorting } = req.query; // Extract query parameters
        const page = Math.floor(start / size) + 1; // Calculate page based on start and size
        const parsedFilters = filters ? JSON.parse(filters) : [];
        const parsedSortings = sorting ? JSON.parse(sorting) : [];

        try {
            const observations = await awarenessPillarModel.fetchALLCreatedObservationsDetails(page, size, parsedFilters, globalFilter, parsedSortings, 3);

            return ResponseHelper.respond(200, true, {
                observations
            }, 'Successfully retrieved observation data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getObservationAllTasks(req, res) {
        const { start, size, filters, globalFilter, sorting } = req.query; // Extract query parameters
        const page = Math.floor(start / size) + 1; // Calculate page based on start and size
        const parsedFilters = filters ? JSON.parse(filters) : [];
        const parsedSortings = sorting ? JSON.parse(sorting) : [];

        try {
            const tasks = await awarenessPillarModel.fetchALLObservationAllTasks(page, size, parsedFilters, globalFilter, parsedSortings, 3);

            return ResponseHelper.respond(200, true, {
                tasks
            }, 'Successfully retrieved observations all task.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }
    
}

module.exports = new AwarenessPillarController();