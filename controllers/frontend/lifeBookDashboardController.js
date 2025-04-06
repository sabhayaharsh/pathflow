const lifeBookModel = require('../../models/frontend/lifeBookModel');
const ResponseHelper = require('../../helpers/responseHelper');

class lifeBookDashboardController {
    // Login
    getLifeBookDashboard = async (req, res) => {
        const userId = req.user.id; // Assuming you have user information attached to the request
        try {
            // Fetch the recent 5 records for each type
            const recentKnowledge = await lifeBookModel.fetchRecentLifeBooks(userId, '1');
            const recentDecision = await lifeBookModel.fetchRecentLifeBooks(userId, '2');
            const recentAwareness = await lifeBookModel.fetchRecentLifeBooks(userId, '3');

            const pillarEventCount = await lifeBookModel.fetchPillarEventCount(userId);
            const pillarTaskCount = await lifeBookModel.fetchPillarTaskCount(userId);
            const { gradeCounts, maxGrade } = await lifeBookModel.getSelfAssessmentGradeCounts(userId);

            const dailyTaskCounts = {};
            for (const pillarType of ['1', '2', '3']) {
                dailyTaskCounts[pillarType] = await lifeBookModel.fetchDailyTaskCount(userId, pillarType);
            }

            const CurrentMonthDates = await lifeBookModel.fetchCurrentMonthDates();

            const result = {
                knowledge: recentKnowledge,
                decision: recentDecision,
                awareness: recentAwareness,
                pillarEventCount,
                pillarTaskCount,
                selfAssessment: { gradeCounts, maxGrade },
                dailyTaskCounts: [dailyTaskCounts['1'], dailyTaskCounts['2'], dailyTaskCounts['3']],
                CurrentMonthDates
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved life book dashboard.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    // get Autocomplete Task data
    async getGlobalData(req, res) {
        try {
            const userId = req.user.id;
            const { searchData } = req.query;
    
            let data = {
                Knowledge: { experiences: [], tasks: [] },
                Decision: { experiences: [], tasks: [] },
                Awareness: { experiences: [], tasks: [] }
            };
    
            if (searchData) {
                // Fetch experiences
                const experiences = await lifeBookModel.getGlobalSearchDataCus({ searchData , userId });
    
                // Fetch tasks
                const tasks = await lifeBookModel.getGlobalTasksBySearch(searchData , userId);
    
                // Combine experiences and tasks
                for (const exp of experiences) {
                    const pillar = exp.type === '1' ? 'Knowledge' :
                                   exp.type === '2' ? 'Decision' :
                                   exp.type === '3' ? 'Awareness' : 'Other';
    
                    data[pillar].experiences.push(exp);
                }
    
                for (const task of tasks) {
                    const pillar = task.pillar;
                    data[pillar].tasks.push(task);
                }
            }
            //console.log( JSON.stringify(data));
            return ResponseHelper.respond(200, true, { data }, 'Successfully retrieved data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }
    
    getGlobalDataById = async (req, res) => {
       try {
        const  { searchid ,type,pillar } = req.query;
        const data = await lifeBookModel.getGlobalSearchDataById(searchid,type,pillar);
        return ResponseHelper.respond(200, true, { data }, 'Successfully retrieved data.', res);
       } catch (error) {
        console.log(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
       }
    }
}

module.exports = new lifeBookDashboardController();
