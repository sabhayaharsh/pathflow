const ResponseHelper = require('../../helpers/responseHelper');
const KnowledgePillarModel = require('../../models/backend/knowledgePillarModel');

class KnowledgePillarController {

    async getExperienceDetails(req, res) {
        try {
            const experienceId = req.params.id;

            const data = await KnowledgePillarModel.GetExperienceUserById(experienceId);

            if (!data || data.length === 0) {
                return ResponseHelper.respond(404, false, null, 'Data not found!', res);
            }

            // Extract the object from the array if it's wrapped in one
            const responseData = Array.isArray(data) ? data[0] : data;

            return ResponseHelper.respond(200, true, responseData, 'Successfully retrieved experience data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getCreatedExperienceDetails(req, res) {
        const { start, size, filters, globalFilter, sorting } = req.query; // Extract query parameters
        const page = Math.floor(start / size) + 1; // Calculate page based on start and size
        const parsedFilters = filters ? JSON.parse(filters) : [];
        const parsedSortings = sorting ? JSON.parse(sorting) : [];

        try {
            const experiences = await KnowledgePillarModel.fetchALLCreatedExperienceDetails(page, size, parsedFilters, globalFilter, parsedSortings, 1);

            return ResponseHelper.respond(200, true, {
                experiences
            }, 'Successfully retrieved experiences data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getExperienceAllTasks(req, res) {
        const { start, size, filters, globalFilter, sorting } = req.query; // Extract query parameters
        const page = Math.floor(start / size) + 1; // Calculate page based on start and size
        const parsedFilters = filters ? JSON.parse(filters) : [];
        const parsedSortings = sorting ? JSON.parse(sorting) : [];

        try {
            const tasks = await KnowledgePillarModel.fetchALLExperienceAllTasks(page, size, parsedFilters, globalFilter, parsedSortings, 1);

            return ResponseHelper.respond(200, true, {
                tasks
            }, 'Successfully retrieved experiences all task.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }
}

module.exports = new KnowledgePillarController();