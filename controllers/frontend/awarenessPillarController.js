const awarenessPillarModel = require('../../models/frontend/awarenessPillarModel');
const ResponseHelper = require('../../helpers/responseHelper');
const pdfcreator = require('../../public/pdf_puppeteer/pdfcreator');

class awarenessPillarController {

    getDashboard = async (req, res) => {
        const userId = req.user.id;
        try {
            // // Fetch total counts
            const observationTotalCounts = await awarenessPillarModel.getTotalObservationCounts(userId);
            const observationTaskTotalCounts = await awarenessPillarModel.getTotalObservationTaskCounts(userId);
            const observationAssessmentTotalCounts = await awarenessPillarModel.getTotalObservationAssessmentCounts(userId);

            const result = {
                observationTotalCounts: observationTotalCounts,
                observationTaskCount: observationTaskTotalCounts,
                observationAssessmentCount: observationAssessmentTotalCounts
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved awareness pillar dashboard.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getRecentObservations(req, res) {
        try {
            const userId = req.user.id;
            const { page } = req.body;
            const search = req.query.search;
            // Set default values for pagination
            const perPage = 10;
            const currentPage = page ? parseInt(page) : 1;
            const offset = (currentPage - 1) * perPage;

            // Prepare filter conditions
            const filterConditions = {
                userId,
                offset,
                perPage,
                search
            };

            // Fetch the observations based on filters
            const recentObservations = await awarenessPillarModel.getRecentObservations(filterConditions);

            // Count total observations for pagination
            const totalObservations = await awarenessPillarModel.getRecentTotalObservation(filterConditions);

            // Calculate pagination info
            const totalPages = Math.ceil(totalObservations / perPage);

            const result = {
                recentObservations,
                pagination: {
                    totalItems: totalObservations,
                    totalPages,
                    currentPage,
                    perPage,
                },
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved recent observations.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getRecentObservationTasks(req, res) {
        try {
            const userId = req.user.id;
            const { page } = req.body;
            const search = req.query.search;

            // Set default values for pagination
            const perPage = 10;
            const currentPage = page ? parseInt(page) : 1;
            const offset = (currentPage - 1) * perPage;

            // Prepare filter conditions
            const filterConditions = {
                userId,
                offset,
                perPage,
                search
            };

            // Fetch the observation tasks based on filters
            const recentObservationTasks = await awarenessPillarModel.getRecentObservationTasks(filterConditions);

            // Count total observation tasks for pagination
            const totalTasks = await awarenessPillarModel.getRecentTotalObservationTasks(filterConditions);

            // Calculate pagination info
            const totalPages = Math.ceil(totalTasks / perPage);

            const result = {
                recentObservationTasks,
                pagination: {
                    totalItems: totalTasks,
                    totalPages,
                    currentPage,
                    perPage,
                },
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved recent observation task.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getRecentObservationAssessments(req, res) {
        try {
            const userId = req.user.id;
            const { page } = req.body;

            // Set default values for pagination
            const perPage = 10;
            const currentPage = page ? parseInt(page) : 1;
            const offset = (currentPage - 1) * perPage;

            // Prepare filter conditions
            const filterConditions = {
                userId,
                offset,
                perPage,
            };

            // Fetch the observation assessments based on filters
            const recentObservationAssessments = await awarenessPillarModel.getRecentObservationAssessments(filterConditions);

            // Count total observation assessments for pagination
            const totalAssessments = await awarenessPillarModel.getRecentTotalObservationAssessments(filterConditions);

            // Calculate pagination info
            const totalPages = Math.ceil(totalAssessments / perPage);

            const result = {
                recentObservationAssessments,
                pagination: {
                    totalItems: totalAssessments,
                    totalPages,
                    currentPage,
                    perPage,
                },
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved recent observation task.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    // create Oppertunity
    async createObservation(req, res) {
        const { title, status, actions, influences, guidePost, emotions, mindset, tasks, tags, files, assessment } = req.body;
        const validationErrors = {};

        // Validate input
        if (!title || !title?.trim()) {
            validationErrors.title = 'The title field is required.';
        } else if (title?.trim().length > 200) {
            validationErrors.title = 'The title field must be maximum 200 characters long.';
        }

        // Validate status field
        if (!status || !['0', '1', '2'].includes(status)) {
            validationErrors.status = 'Invalid value for status. It should be one of: 0, 1, 2.';
        }

        // Validate actions field
        if (actions !== null && actions.length > 0) {
            const actionNames = new Set(); // Set to store unique action names
            const insights = new Set(); // Set to store unique insights
            const analysis = new Set(); // Set to store unique analysis
            const actionErrors = {}; // Object to store errors for actions

            actions.forEach((action, index) => {
                const currentActionErrors = {};

                // Validate name field
                if (!action.name || !action.name.trim()) {
                    currentActionErrors.name = 'Please fill out the action title field in all actions. It is required to proceed.';
                } else if (action.name.trim().length > 5000) {
                    currentActionErrors.name = 'Action name must be maximum 5000 characters long.';
                }

                // Validate insight field
                if (!action.insight || !action.insight.trim()) {
                    currentActionErrors.insight = 'Please fill out the insight field in all actions. It is required to proceed.';
                } else if (action.insight.trim().length > 5000) {
                    currentActionErrors.insight = 'Insight must be maximum 5000 characters long.';
                }

                // Validate analysis field
                if (!action.analysis || !action.analysis.trim()) {
                    currentActionErrors.analysis = 'Please fill out the analysis field in all actions. It is required to proceed.';
                } else if (action.analysis.trim().length > 5000) {
                    currentActionErrors.analysis = 'Analysis must be maximum 5000 characters long.';
                }

                // Check if action name is unique
                if (action.name.trim() && actionNames.has(action.name.trim())) {
                    currentActionErrors.name = 'Action title must be unique.';
                } else {
                    actionNames.add(action.name.trim());
                }

                // Check if insight name is unique
                if (insights.has(action.insight.trim())) {
                    currentActionErrors.insight = 'Insight must be unique.';
                } else {
                    insights.add(action.insight.trim());
                }

                // Check if analysis name is unique
                if (analysis.has(action.analysis.trim())) {
                    currentActionErrors.analysis = 'Analysis must be unique.';
                } else {
                    analysis.add(action.analysis.trim());
                }

                // Merge currentActionErrors into actionErrors
                Object.assign(actionErrors, currentActionErrors);
            });

            // If there are any errors for any action, return actionErrors
            if (Object.keys(actionErrors).length > 0) {
                return res.status(400).json({ success: false, data: { error: actionErrors } });
            }
        }

        // Validate influences field
        if (influences !== null && influences.length > 0) {
            const influenceNames = new Set(); // Set to store unique influence names
            const insights = new Set(); // Set to store unique insights
            const analysis = new Set(); // Set to store unique analysis
            const influenceErrors = {}; // Object to store errors for influences

            influences.forEach((influence, index) => {
                const currentInfluenceErrors = {};

                // Validate name field
                if (!influence.name || !influence.name.trim()) {
                    currentInfluenceErrors.name = 'Please fill out the influence title field in all influences. It is required to proceed.';
                } else if (influence.name.trim().length > 200) {
                    currentInfluenceErrors.name = 'Influence name must be maximum 200 characters long.';
                }

                // Validate insight field
                if (!influence.insight || !influence.insight.trim()) {
                    currentInfluenceErrors.insight = 'Please fill out the insight field in all influences. It is required to proceed.';
                } else if (insights.has(influence.insight.trim())) {
                    currentInfluenceErrors.insight = 'Insight must be unique.';
                } else if (influence.insight.trim().length > 5000) {
                    currentInfluenceErrors.insight = 'Insight must be maximum 5000 characters long.';
                } else {
                    insights.add(influence.insight.trim());
                }

                // Validate analysis field
                if (!influence.analysis || !influence.analysis.trim()) {
                    currentInfluenceErrors.analysis = 'Please fill out the analysis field in all influences. It is required to proceed.';
                } else if (analysis.has(influence.analysis.trim())) {
                    currentInfluenceErrors.analysis = 'Analysis must be unique.';
                } else if (influence.analysis.trim().length > 5000) {
                    currentInfluenceErrors.analysis = 'Analysis must be maximum 5000 characters long.';
                } else {
                    analysis.add(influence.analysis.trim());
                }

                // Check if influence name is unique
                if (influenceNames.has(influence.name.trim())) {
                    currentInfluenceErrors.name = 'Influence title must be unique.';
                } else {
                    influenceNames.add(influence.name.trim());
                }

                // Merge currentInfluenceErrors into influenceErrors
                Object.assign(influenceErrors, currentInfluenceErrors);
            });

            // If there are any errors for any influence, return influenceErrors
            if (Object.keys(influenceErrors).length > 0) {
                return res.status(400).json({ success: false, data: { error: influenceErrors } });
            }
        }

        // Validate guidePost field
        if (guidePost !== null && guidePost.length > 0) {
            const guidePostNames = new Set(); // Set to store unique guidePost names
            const guidePostInsights = new Set(); // Set to store unique insights
            const guidePostAnalysis = new Set(); // Set to store unique analysis
            const guidePostErrors = {}; // Object to store errors for guidePost

            guidePost.forEach((post, index) => {
                const currentGuidePostErrors = {};

                // Validate name field
                if (!post.name || !post.name.trim()) {
                    currentGuidePostErrors.name = 'Please fill out the Guidepost title field in all Guidepost. It is required to proceed.';
                } else if (post.name.trim().length > 5000) {
                    currentGuidePostErrors.name = 'GuidePost name must be maximum 5000 characters long.';
                }

                // Validate insight field
                if (!post.insight || !post.insight.trim()) {
                    currentGuidePostErrors.insight = 'Please fill out the insight field in all Guidepost. It is required to proceed.';
                } else if (post.insight.trim().length > 5000) {
                    currentGuidePostErrors.insight = 'Insight must be maximum 5000 characters long.';
                }

                // Validate analysis field
                if (!post.analysis || !post.analysis.trim()) {
                    currentGuidePostErrors.analysis = 'Please fill out the analysis field in all Guidepost. It is required to proceed.';
                } else if (post.analysis.trim().length > 5000) {
                    currentGuidePostErrors.analysis = 'Analysis must be maximum 5000 characters long.';
                }

                // Check if guidePost name is unique
                if (post.name.trim() && guidePostNames.has(post.name.trim())) {
                    currentGuidePostErrors.name = 'Guidepost title must be unique.';
                } else {
                    guidePostNames.add(post.name.trim());
                }

                // Check if insight name is unique
                if (post.insight.trim() && guidePostInsights.has(post.insight.trim())) {
                    currentGuidePostErrors.insight = 'Insight must be unique.';
                } else {
                    guidePostInsights.add(post.insight.trim());
                }

                // Check if analysis name is unique
                if (post.analysis.trim() && guidePostAnalysis.has(post.analysis.trim())) {
                    currentGuidePostErrors.analysis = 'Analysis must be unique.';
                } else {
                    guidePostAnalysis.add(post.analysis.trim());
                }

                // Merge currentGuidePostErrors into guidePostErrors
                Object.assign(guidePostErrors, currentGuidePostErrors);
            });

            // If there are any errors for any guidePost, return guidePostErrors
            if (Object.keys(guidePostErrors).length > 0) {
                return res.status(400).json({ success: false, data: { error: guidePostErrors } });
            }
        }

        // Validate emotions field
        if (emotions !== null && emotions.length > 0) {
            const emotionNames = new Set(); // Set to store unique emotion names
            const insights = new Set(); // Set to store unique insights
            const analysis = new Set(); // Set to store unique analysis
            const emotionErrors = {}; // Object to store errors for emotions

            emotions.forEach((emotion, index) => {
                const currentEmotionErrors = {};

                // Validate name field
                if (!emotion.name || !emotion.name.trim()) {
                    currentEmotionErrors.name = 'Please fill out the emotion title field in all emotions. It is required to proceed.';
                } else if (emotion.name.trim().length > 200) {
                    currentEmotionErrors.name = 'Emotion name must be maximum 200 characters long.';
                }

                // Validate insight field
                if (!emotion.insight || !emotion.insight.trim()) {
                    currentEmotionErrors.insight = 'Please fill out the insight field in all emotions. It is required to proceed.';
                } else if (emotion.insight.trim().length > 5000) {
                    currentEmotionErrors.insight = 'Insight must be maximum 5000 characters long.';
                }

                // Validate analysis field
                if (!emotion.analysis || !emotion.analysis.trim()) {
                    currentEmotionErrors.analysis = 'Please fill out the analysis field in all emotions. It is required to proceed.';
                } else if (emotion.analysis.trim().length > 5000) {
                    currentEmotionErrors.analysis = 'Analysis must be maximum 5000 characters long.';
                }

                // Check if emotion name is unique
                if (emotion.name.trim() && emotion.name.trim() && emotionNames.has(emotion.name.trim())) {
                    currentEmotionErrors.name = 'Emotion title must be unique.';
                } else {
                    emotionNames.add(emotion.name.trim());
                }

                // Check if insight name is unique
                if (emotion.insight.trim() && insights.has(emotion.insight.trim())) {
                    currentEmotionErrors.insight = 'Insight must be unique.';
                } else {
                    insights.add(emotion.insight.trim());
                }

                // Check if analysis name is unique
                if (emotion.analysis.trim() && analysis.has(emotion.analysis.trim())) {
                    currentEmotionErrors.analysis = 'Analysis must be unique.';
                } else {
                    analysis.add(emotion.analysis.trim());
                }

                // Merge currentEmotionErrors into emotionErrors
                Object.assign(emotionErrors, currentEmotionErrors);
            });

            // If there are any errors for any emotion, return emotionErrors
            if (Object.keys(emotionErrors).length > 0) {
                return res.status(400).json({ success: false, data: { error: emotionErrors } });
            }
        }

        // Validate mindset field
        if (mindset !== null && mindset.length > 0) {
            const mindsetNames = new Set(); // Set to store unique mindset names
            const mindsetInsights = new Set(); // Set to store unique insights
            const mindsetAnalysis = new Set(); // Set to store unique analysis
            const mindsetErrors = {}; // Object to store errors for mindset

            mindset.forEach((mind, index) => {
                const currentMindsetErrors = {};

                // Validate name field
                if (!mind.name || !mind.name.trim()) {
                    currentMindsetErrors.name = 'Please fill out the self title field in all self. It is required to proceed.';
                } else if (mind.name.trim().length > 200) {
                    currentMindsetErrors.name = 'self name must be maximum 200 characters long.';
                }

                // Validate insight field
                if (!mind.insight || !mind.insight.trim()) {
                    currentMindsetErrors.insight = 'Please fill out the insight field in all self. It is required to proceed.';
                } else if (mind.insight.trim().length > 5000) {
                    currentMindsetErrors.insight = 'Insight must be maximum 5000 characters long.';
                }

                // Validate analysis field
                if (!mind.analysis || !mind.analysis.trim()) {
                    currentMindsetErrors.analysis = 'Please fill out the analysis field in all self. It is required to proceed.';
                } else if (mind.analysis.trim().length > 5000) {
                    currentMindsetErrors.analysis = 'Analysis must be maximum 5000 characters long.';
                }

                // Check if mindset name is unique
                if (mind.name.trim() && mindsetNames.has(mind.name.trim())) {
                    currentMindsetErrors.name = 'Self title must be unique.';
                } else {
                    mindsetNames.add(mind.name.trim());
                }

                // Check if insight name is unique
                if (mind.insight.trim() && mindsetInsights.has(mind.insight.trim())) {
                    currentMindsetErrors.insight = 'Insight must be unique.';
                } else {
                    mindsetInsights.add(mind.insight.trim());
                }

                // Check if analysis name is unique
                if (mind.analysis.trim() && mindsetAnalysis.has(mind.analysis.trim())) {
                    currentMindsetErrors.analysis = 'Analysis must be unique.';
                } else {
                    mindsetAnalysis.add(mind.analysis.trim());
                }

                // Merge currentMindsetErrors into mindsetErrors
                Object.assign(mindsetErrors, currentMindsetErrors);
            });

            // If there are any errors for any mindset, return mindsetErrors
            if (Object.keys(mindsetErrors).length > 0) {
                return res.status(400).json({ success: false, data: { error: mindsetErrors } });
            }
        }

        if (tasks !== null && tasks.length > 0) {
            const taskNames = tasks.map(task => task.name);

            // Check if any task name is empty
            const isEmptyTask = tasks.some(task => !task.name.trim());
            if (isEmptyTask) {
                validationErrors.tasks = 'Please fill out the task field in all tabs. It is required to proceed.';
            } else {
                // Check if any task name exceeds 200 characters
                const isOverLengthTask = tasks.some(task => task.name.trim().length > 200);
                const isdownLengthTask = tasks.some(task => task.name.trim().length < 3);
                if (isdownLengthTask) {
                    validationErrors.tasks = 'Task must be minimum 3 characters long.';
                }
                if (isOverLengthTask) {
                    validationErrors.tasks = 'Task names must be maximum 200 characters long.';
                } else {
                    // Check for uniqueness
                    const uniqueTaskNames = new Set(taskNames); // Using Set to ensure uniqueness
                    if (taskNames.length !== uniqueTaskNames.size) {
                        validationErrors.tasks = 'Task name must be unique.';
                    }
                }
            }
        }

        if (tags !== null && tags.length > 0) {
            const tagNames = tags.map(tag => tag.name);

            // Check if any tag name has length less than 10 characters
            const isBelowLengthTag = tags.some(tag => tag.name.trim().length > 10);
            if (isBelowLengthTag) {
                validationErrors.tags = 'Tag name must be at least 10 characters long.';
            } else {
                // Check for uniqueness
                const uniqueTagNames = new Set(tagNames); // Using Set to ensure uniqueness
                if (tagNames.length !== uniqueTagNames.size) {
                    validationErrors.tags = 'Tag name must be unique.';
                }
            }
        }

        if (assessment && assessment.length > 0) {
            const [assessmentData] = assessment;
            validationErrors.assessment = {};
            // Check if assessmentData is not empty (at least one field has a non-empty value)
            const assessmentNotEmpty = Object?.values(assessmentData).some(value => value !== '');

            if (assessmentNotEmpty) {
                if (!/^[1-6]$/.test(assessmentData?.grade.trim())) {
                    validationErrors.assessment.grade = 'Invalid value for grade. Must be a letter between A and F.';
                }

                if (
                    assessmentData?.did_progress_towards_life_purpose &&
                    !['1', '0'].includes(assessmentData?.did_progress_towards_life_purpose)
                ) {
                    validationErrors.assessment.did_progress_towards_life_purpose = 'Invalid value for did_progress_towards_life_purpose.';
                }

                if (
                    assessmentData?.did_help_another_person &&
                    !['1', '0', '2'].includes(assessmentData?.did_help_another_person)
                ) {
                    validationErrors.assessment.did_help_another_person = 'Invalid value for did_help_another_person.';
                }

                if (assessmentData?.do_differently && !assessmentData.do_differently.trim()) {
                    validationErrors.assessment.do_differently = 'Invalid value for do_differently.';
                }

                if (assessmentData?.comments && !assessmentData.comments.trim()) {
                    validationErrors.assessment.comments = 'Invalid value for comments.';
                }
            }

            // Remove empty fields from the error object
            Object.keys(validationErrors?.assessment).forEach(key => {
                if (!validationErrors.assessment[key]) {
                    delete validationErrors.assessment[key];
                }
            });

            // If there are no errors or if assessmentData is empty, remove the assessment key from validationErrors
            if (Object.keys(validationErrors?.assessment).length === 0 || !assessmentNotEmpty) {
                delete validationErrors.assessment;
            }
        }

        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({ success: false, data: { error: validationErrors } });
        }

        try {
            const userId = req.user.id;
            const url = req.protocol + '://' + req.get('host');

            const existingObservation = await awarenessPillarModel.getObservationByNameAndUserId(title, userId);
            if (existingObservation.length > 0) {
                validationErrors.name = 'Mindfulness title already exists.';
                return ResponseHelper.validateAndRespond(validationErrors, null, res);
            }
            const addObservation = {
                userId: userId,
                title: title,
                status: status,
                actions: actions,
                influences: influences,
                guidePost: guidePost,
                emotions: emotions,
                mindset: mindset,
                tasks: tasks,
                tags: tags,
                files: files,
                assessment: assessment,
            };

            const insertedObservationData = await awarenessPillarModel.createObservation(addObservation, url);

            if (insertedObservationData.success === false) {
                return ResponseHelper.respond(400, false, insertedObservationData, 'Mindfulness created failed!', res);
            } else {
                return ResponseHelper.respond(200, true, insertedObservationData, 'Mindfulness created successfully.', res);
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    // get Experience User Wise
    async getObservationIDWise(req, res) {
        try {
            const userId = req.user.id;
            const observationId = req.params.id;

            const data = await awarenessPillarModel.GetObservationIdWise(userId, observationId);

            if (!data || data.length === 0) {
                return ResponseHelper.respond(404, false, { error: { message: 'Data not found!' } }, 'Data not found!', res);
            }

            // Extract the object from the array if it's wrapped in one
            const observationData = Array.isArray(data) ? data[0] : data;

            return ResponseHelper.respond(200, true, observationData, 'Successfully retrieved observation data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getObservationPdfPrint(req, res) {
        try {
            const userId = req.user.id;
            const observationId = req.params.id;

            const data = await awarenessPillarModel.GetObservationPdfPrint(userId, observationId);

            
            if (!data || data.length === 0) {
                return ResponseHelper.respond(404, false, { error: { message: 'Data not found!' } }, 'Data not found!', res);
            }

            // Extract the object from the array if it's wrapped in one
            const observationData = Array.isArray(data) ? data[0] : data;

            const fileurl = await pdfcreator.awarnesspdfexport(observationData); 
            return ResponseHelper.respond(200, true, fileurl, 'Successfully retrieved observation data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async updateobservation(req, res) {
        const { id } = req.params;
        const userId = req.user.id;
        const { title, status, actions, influences, guidePost, emotions, mindset, tasks, tags, files, assessment } = req.body;
        const validationErrors = {};

        // Validate input
        if (!title || !title?.trim()) {
            validationErrors.title = 'The title field is required.';
        } else if (title?.trim().length > 200) {
            validationErrors.title = 'The title field must be maximum 200 characters long.';
        }
        // Validate status field
        if (!status || !['0', '1', '2'].includes(status)) {
            validationErrors.status = 'Invalid value for status. It should be one of: 0, 1, 2.';
        }
        // Validate actions field
        if (actions !== null && actions.length > 0) {
            const actionNames = new Set(); // Set to store unique action names
            const insights = new Set(); // Set to store unique insights
            const analysis = new Set(); // Set to store unique analysis
            const actionErrors = {}; // Object to store errors for actions

            actions.forEach((action, index) => {
                const currentActionErrors = {};

                // Validate name field
                if (!action.name || !action.name.trim()) {
                    currentActionErrors.name = 'Please fill out the action title field in all actions. It is required to proceed.';
                } else if (action.name.trim().length > 5000) {
                    currentActionErrors.name = 'Action name must be maximum 5000 characters long.';
                }

                // Validate insight field
                if (!action.insight || !action.insight.trim()) {
                    currentActionErrors.insight = 'Please fill out the insight field in all actions. It is required to proceed.';
                } else if (action.insight.trim().length > 5000) {
                    currentActionErrors.insight = 'Insight must be maximum 5000 characters long.';
                }

                // Validate analysis field
                if (!action.analysis || !action.analysis.trim()) {
                    currentActionErrors.analysis = 'Please fill out the analysis field in all actions. It is required to proceed.';
                } else if (action.analysis.trim().length > 5000) {
                    currentActionErrors.analysis = 'Analysis must be maximum 5000 characters long.';
                }

                // Check if action name is unique
                if (action.name.trim() && actionNames.has(action.name.trim())) {
                    currentActionErrors.name = 'Action title must be unique.';
                } else {
                    actionNames.add(action.name.trim());
                }

                // Check if insight name is unique
                if (insights.has(action.insight.trim())) {
                    currentActionErrors.insight = 'Insight must be unique.';
                } else {
                    insights.add(action.insight.trim());
                }

                // Check if analysis name is unique
                if (analysis.has(action.analysis.trim())) {
                    currentActionErrors.analysis = 'Analysis must be unique.';
                } else {
                    analysis.add(action.analysis.trim());
                }

                // Merge currentActionErrors into actionErrors
                Object.assign(actionErrors, currentActionErrors);
            });

            // If there are any errors for any action, return actionErrors
            if (Object.keys(actionErrors).length > 0) {
                return res.status(400).json({ success: false, data: { error: actionErrors } });
            }
        }

        // Validate influences field
        if (influences !== null && influences.length > 0) {
            const influenceNames = new Set(); // Set to store unique influence names
            const insights = new Set(); // Set to store unique insights
            const analysis = new Set(); // Set to store unique analysis
            const influenceErrors = {}; // Object to store errors for influences

            influences.forEach((influence, index) => {
                const currentInfluenceErrors = {};

                // Validate name field
                if (!influence.name || !influence.name.trim()) {
                    currentInfluenceErrors.name = 'Please fill out the influence title field in all influences. It is required to proceed.';
                } else if (influence.name.trim().length > 200) {
                    currentInfluenceErrors.name = 'Influence name must be maximum 200 characters long.';
                }

                // Validate insight field
                if (!influence.insight || !influence.insight.trim()) {
                    currentInfluenceErrors.insight = 'Please fill out the insight field in all influences. It is required to proceed.';
                } else if (insights.has(influence.insight.trim())) {
                    currentInfluenceErrors.insight = 'Insight must be unique.';
                } else if (influence.insight.trim().length > 5000) {
                    currentInfluenceErrors.insight = 'Insight must be maximum 5000 characters long.';
                } else {
                    insights.add(influence.insight.trim());
                }

                // Validate analysis field
                if (!influence.analysis || !influence.analysis.trim()) {
                    currentInfluenceErrors.analysis = 'Please fill out the analysis field in all influences. It is required to proceed.';
                } else if (analysis.has(influence.analysis.trim())) {
                    currentInfluenceErrors.analysis = 'Analysis must be unique.';
                } else if (influence.analysis.trim().length > 5000) {
                    currentInfluenceErrors.analysis = 'Analysis must be maximum 5000 characters long.';
                } else {
                    analysis.add(influence.analysis.trim());
                }

                // Check if influence name is unique
                if (influenceNames.has(influence.name.trim())) {
                    currentInfluenceErrors.name = 'Influence title must be unique.';
                } else {
                    influenceNames.add(influence.name.trim());
                }

                // Merge currentInfluenceErrors into influenceErrors
                Object.assign(influenceErrors, currentInfluenceErrors);
            });

            // If there are any errors for any influence, return influenceErrors
            if (Object.keys(influenceErrors).length > 0) {
                return res.status(400).json({ success: false, data: { error: influenceErrors } });
            }
        }

        // Validate guidePost field
        if (guidePost !== null && guidePost.length > 0) {
            const guidePostNames = new Set(); // Set to store unique guidePost names
            const guidePostInsights = new Set(); // Set to store unique insights
            const guidePostAnalysis = new Set(); // Set to store unique analysis
            const guidePostErrors = {}; // Object to store errors for guidePost

            guidePost.forEach((post, index) => {
                const currentGuidePostErrors = {};

                // Validate name field
                if (!post.name || !post.name.trim()) {
                    currentGuidePostErrors.name = 'Please fill out the Guidepost title field in all Guidepost. It is required to proceed.';
                } else if (post.name.trim().length > 5000) {
                    currentGuidePostErrors.name = 'Guidepost name must be maximum 5000 characters long.';
                }

                // Validate insight field
                if (!post.insight || !post.insight.trim()) {
                    currentGuidePostErrors.insight = 'Please fill out the insight field in all Guidepost. It is required to proceed.';
                } else if (post.insight.trim().length > 5000) {
                    currentGuidePostErrors.insight = 'Insight must be maximum 5000 characters long.';
                }

                // Validate analysis field
                if (!post.analysis || !post.analysis.trim()) {
                    currentGuidePostErrors.analysis = 'Please fill out the analysis field in all Guidepost. It is required to proceed.';
                } else if (post.analysis.trim().length > 5000) {
                    currentGuidePostErrors.analysis = 'Analysis must be maximum 5000 characters long.';
                }

                // Check if guidePost name is unique
                if (post.name.trim() && guidePostNames.has(post.name.trim())) {
                    currentGuidePostErrors.name = 'Guidepost title must be unique.';
                } else {
                    guidePostNames.add(post.name.trim());
                }

                // Check if insight name is unique
                if (post.insight.trim() && guidePostInsights.has(post.insight.trim())) {
                    currentGuidePostErrors.insight = 'Insight must be unique.';
                } else {
                    guidePostInsights.add(post.insight.trim());
                }

                // Check if analysis name is unique
                if (post.analysis.trim() && guidePostAnalysis.has(post.analysis.trim())) {
                    currentGuidePostErrors.analysis = 'Analysis must be unique.';
                } else {
                    guidePostAnalysis.add(post.analysis.trim());
                }

                // Merge currentGuidePostErrors into guidePostErrors
                Object.assign(guidePostErrors, currentGuidePostErrors);
            });

            // If there are any errors for any guidePost, return guidePostErrors
            if (Object.keys(guidePostErrors).length > 0) {
                return res.status(400).json({ success: false, data: { error: guidePostErrors } });
            }
        }

        // Validate mindset field
        if (mindset !== null && mindset.length > 0) {
            const mindsetNames = new Set(); // Set to store unique mindset names
            const mindsetInsights = new Set(); // Set to store unique insights
            const mindsetAnalysis = new Set(); // Set to store unique analysis
            const mindsetErrors = {}; // Object to store errors for mindset

            mindset.forEach((mind, index) => {
                const currentMindsetErrors = {};

                // Validate name field
                if (!mind.name || !mind.name.trim()) {
                    currentMindsetErrors.name = 'Please fill out the self title field in all self. It is required to proceed.';
                } else if (mind.name.trim().length > 200) {
                    currentMindsetErrors.name = 'self name must be maximum 200 characters long.';
                }

                // Validate insight field
                if (!mind.insight || !mind.insight.trim()) {
                    currentMindsetErrors.insight = 'Please fill out the insight field in all self. It is required to proceed.';
                } else if (mind.insight.trim().length > 5000) {
                    currentMindsetErrors.insight = 'Insight must be maximum 5000 characters long.';
                }

                // Validate analysis field
                if (!mind.analysis || !mind.analysis.trim()) {
                    currentMindsetErrors.analysis = 'Please fill out the analysis field in all self. It is required to proceed.';
                } else if (mind.analysis.trim().length > 5000) {
                    currentMindsetErrors.analysis = 'Analysis must be maximum 5000 characters long.';
                }

                // Check if mindset name is unique
                if (mind.name.trim() && mindsetNames.has(mind.name.trim())) {
                    currentMindsetErrors.name = 'self title must be unique.';
                } else {
                    mindsetNames.add(mind.name.trim());
                }

                // Check if insight name is unique
                if (mind.insight.trim() && mindsetInsights.has(mind.insight.trim())) {
                    currentMindsetErrors.insight = 'Insight must be unique.';
                } else {
                    mindsetInsights.add(mind.insight.trim());
                }

                // Check if analysis name is unique
                if (mind.analysis.trim() && mindsetAnalysis.has(mind.analysis.trim())) {
                    currentMindsetErrors.analysis = 'Analysis must be unique.';
                } else {
                    mindsetAnalysis.add(mind.analysis.trim());
                }

                // Merge currentMindsetErrors into mindsetErrors
                Object.assign(mindsetErrors, currentMindsetErrors);
            });

            // If there are any errors for any mindset, return mindsetErrors
            if (Object.keys(mindsetErrors).length > 0) {
                return res.status(400).json({ success: false, data: { error: mindsetErrors } });
            }
        }

        // Validate emotions field
        if (emotions !== null && emotions.length > 0) {
            const emotionNames = new Set(); // Set to store unique emotion names
            const insights = new Set(); // Set to store unique insights
            const analysis = new Set(); // Set to store unique analysis
            const emotionErrors = {}; // Object to store errors for emotions

            emotions.forEach((emotion, index) => {
                const currentEmotionErrors = {};

                // Validate name field
                if (!emotion.name || !emotion.name.trim()) {
                    currentEmotionErrors.name = 'Please fill out the emotion title field in all emotions. It is required to proceed.';
                } else if (emotion.name.trim().length > 200) {
                    currentEmotionErrors.name = 'Emotion name must be maximum 200 characters long.';
                }

                // Validate insight field
                if (!emotion.insight || !emotion.insight.trim()) {
                    currentEmotionErrors.insight = 'Please fill out the insight field in all emotions. It is required to proceed.';
                } else if (emotion.insight.trim().length > 5000) {
                    currentEmotionErrors.insight = 'Insight must be maximum 5000 characters long.';
                }

                // Validate analysis field
                if (!emotion.analysis || !emotion.analysis.trim()) {
                    currentEmotionErrors.analysis = 'Please fill out the analysis field in all emotions. It is required to proceed.';
                } else if (emotion.analysis.trim().length > 5000) {
                    currentEmotionErrors.analysis = 'Analysis must be maximum 5000 characters long.';
                }

                // Check if emotion name is unique
                if (emotion.name.trim() && emotion.name.trim() && emotionNames.has(emotion.name.trim())) {
                    currentEmotionErrors.name = 'Emotion title must be unique.';
                } else {
                    emotionNames.add(emotion.name.trim());
                }

                // Check if insight name is unique
                if (emotion.insight.trim() && insights.has(emotion.insight.trim())) {
                    currentEmotionErrors.insight = 'Insight must be unique.';
                } else {
                    insights.add(emotion.insight.trim());
                }

                // Check if analysis name is unique
                if (emotion.analysis.trim() && analysis.has(emotion.analysis.trim())) {
                    currentEmotionErrors.analysis = 'Analysis must be unique.';
                } else {
                    analysis.add(emotion.analysis.trim());
                }

                // Merge currentEmotionErrors into emotionErrors
                Object.assign(emotionErrors, currentEmotionErrors);
            });

            // If there are any errors for any emotion, return emotionErrors
            if (Object.keys(emotionErrors).length > 0) {
                return res.status(400).json({ success: false, data: { error: emotionErrors } });
            }
        }

        if (tasks !== null && tasks.length > 0) {
            const taskNames = tasks.map(task => task.name);

            // Check if any task name is empty
            const isEmptyTask = tasks.some(task => !task.name.trim());
            if (isEmptyTask) {
                validationErrors.tasks = 'Please fill out the task field in all tabs. It is required to proceed.';
            } else {
                // Check if any task name exceeds 200 characters
                const isOverLengthTask = tasks.some(task => task.name.trim().length > 200);
                const isdownLengthTask = tasks.some(task => task.name.trim().length < 3);
                if (isdownLengthTask) {
                    validationErrors.tasks = 'Task must be minimum 3 characters long.';
                }
                if (isOverLengthTask) {
                    validationErrors.tasks = 'Task names must be maximum 200 characters long.';
                } else {
                    // Check for uniqueness
                    const uniqueTaskNames = new Set(taskNames); // Using Set to ensure uniqueness
                    if (taskNames.length !== uniqueTaskNames.size) {
                        validationErrors.tasks = 'Task name must be unique.';
                    }
                }
            }
        }

        if (tags !== null && tags.length > 0) {
            const tagNames = tags.map(tag => tag.name);

            // Check if any tag name has length less than 10 characters
            const isBelowLengthTag = tags.some(tag => tag.name.trim().length > 10);
            if (isBelowLengthTag) {
                validationErrors.tags = 'Tag name must be at least 10 characters long.';
            } else {
                // Check for uniqueness
                const uniqueTagNames = new Set(tagNames); // Using Set to ensure uniqueness
                if (tagNames.length !== uniqueTagNames.size) {
                    validationErrors.tags = 'Tag name must be unique.';
                }
            }
        }

        if (assessment && assessment.length > 0) {
            const [assessmentData] = assessment;
            validationErrors.assessment = {};

            // Check if assessmentData is not empty (at least one field has a non-empty value)
            const assessmentNotEmpty = Object?.values(assessmentData).some(value => value !== '');

            if (assessmentNotEmpty) {
                if (!/^[1-8]$/.test(assessmentData?.grade?.trim())) {
                    validationErrors.assessment.grade = 'Invalid value for grade. Must be a letter between A and F.';
                }

                if (
                    assessmentData?.did_progress_towards_life_purpose &&
                    !['1', '0'].includes(assessmentData?.did_progress_towards_life_purpose)
                ) {
                    validationErrors.assessment.did_progress_towards_life_purpose = 'Invalid value for did_progress_towards_life_purpose.';
                }

                if (
                    assessmentData?.did_help_another_person &&
                    !['1', '0', '2'].includes(assessmentData?.did_help_another_person)
                ) {
                    validationErrors.assessment.did_help_another_person = 'Invalid value for did_help_another_person.';
                }

                if (assessmentData?.do_differently && !assessmentData.do_differently.trim()) {
                    validationErrors.assessment.do_differently = 'Invalid value for do_differently.';
                }

                if (assessmentData?.comments && !assessmentData.comments.trim()) {
                    validationErrors.assessment.comments = 'Invalid value for comments.';
                }
            }

            // Remove empty fields from the error object
            Object.keys(validationErrors?.assessment).forEach(key => {
                if (!validationErrors.assessment[key]) {
                    delete validationErrors.assessment[key];
                }
            });

            // If there are no errors or if assessmentData is empty, remove the assessment key from validationErrors
            if (Object.keys(validationErrors?.assessment).length === 0 || !assessmentNotEmpty) {
                delete validationErrors.assessment;
            }
        }

        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({ success: false, data: { error: validationErrors } });
        }

        try {
            const existingObservation = await awarenessPillarModel.getObservationByName(title, userId, id);
            if (existingObservation.length > 0) {
                validationErrors.name = 'Mindfulness title already exists.';
                return ResponseHelper.validateAndRespond(validationErrors, null, res);
            }

            const updateObservationData = {
                userId,
                id,
                title,
                status,
                actions,
                influences,
                guidePost,
                emotions,
                mindset,
                tasks,
                tags,
                files,
                assessment
            };

            const updatedObservationData = await awarenessPillarModel.updateObservation(updateObservationData);

            const experinceid = updatedObservationData.id;
            const allTasksComplete = updatedObservationData.tasks.every(task => task.status === 1);
            if (allTasksComplete) {
                if (experinceid) {
                    await awarenessPillarModel.Updateis_completed_task(experinceid, "1");
                }
            } else {
                if (experinceid) {
                    await awarenessPillarModel.Updateis_completed_task(experinceid, "0");
                }
            }

            // Optionally, log the total length of tasks for verification
            const totalTasks = updatedObservationData.tasks.length;
            if (updatedObservationData.success === false) {
                return ResponseHelper.respond(400, false, updatedObservationData, 'Mindfulness update failed!', res);
            } else {
                return ResponseHelper.respond(200, true, updatedObservationData, 'Mindfulness updated successfully.', res);
            }

        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    // Delete Observation ID wise
    async deleteObservation(req, res) {
        const { id } = req.params;
        try {
            const deleteObservationData = {
                id
            };

            const deleteObservation = await awarenessPillarModel.deleteObservation(deleteObservationData);

            if (deleteObservation.success === false) {
                return ResponseHelper.respond(400, false, deleteObservation, 'Mindfulness delete failed!', res);
            } else {
                return ResponseHelper.respond(200, true, deleteObservation, 'Mindfulness delete successfully.', res);
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    // get all experience
    async getAllObservation(req, res) {
        try {
            const userId = req.user.id;
            const { fromDate, toDate, status, sortBy, sortOrder, page } = req.body;
            const search = req.query.search;

            // Set default values for pagination
            const perPage = 10;
            const currentPage = page ? parseInt(page) : 1;
            const offset = (currentPage - 1) * perPage;
            // Prepare filter conditions

            const filterConditions = {
                userId,
                fromDate,
                toDate,
                status,
                sortBy: sortBy || 'id',
                sortOrder: sortOrder || 'desc',
                offset,
                perPage,
                search
            };

            // Fetch the experiences based on filters
            const observations = await awarenessPillarModel.getFilteredobservation(filterConditions);

            // Count total experiences for pagination
            const totalObservations = await awarenessPillarModel.getTotalObservation(filterConditions);

            // Calculate pagination info
            const totalPages = Math.ceil(totalObservations / perPage);

            const result = {
                observations,
                pagination: {
                    totalItems: totalObservations,
                    totalPages,
                    currentPage,
                    perPage,
                },
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved all Mindfulness data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    // get all Tasks
    async getAllTasks(req, res) {
        try {
            const userId = req.user.id;
            const { fromDate, toDate, status, sortBy, sortOrder, page, observationTitle } = req.body;

            // Set default values for pagination
            const perPage = 10;
            const currentPage = page ? parseInt(page) : 1;
            const offset = (currentPage - 1) * perPage;
            const search = req.query.search;
            // Prepare filter conditions
            const filterConditions = {
                userId,
                fromDate,
                toDate,
                status,
                sortBy: sortBy || 'lbt.id',
                sortOrder: sortOrder || 'desc',
                offset,
                perPage,
                observationTitle,
                search
            };
            // Fetch the experiences based on filters
            const tasks = await awarenessPillarModel.getFilteredTasks(filterConditions);

            // Count total experiences for pagination
            const totalTasks = await awarenessPillarModel.getTotalTasks(filterConditions);

            // Calculate pagination info
            const totalPages = Math.ceil(totalTasks / perPage);

            const result = {
                tasks,
                pagination: {
                    totalItems: totalTasks,
                    totalPages,
                    currentPage,
                    perPage,
                },
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved Mindfulness tasks.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    // get all assessments
    async getAllAssessments(req, res) {
        try {
            const userId = req.user.id;
            const { fromDate, toDate, status, sortBy, sortOrder, page, observationTitle } = req.body;
            const search = req.query.search;
            // Set default values for pagination
            const perPage = 10;
            const currentPage = page ? parseInt(page) : 1;
            const offset = (currentPage - 1) * perPage;

            // Prepare filter conditions
            const filterConditions = {
                userId,
                fromDate,
                toDate,
                status,
                sortBy: sortBy || 'id',
                sortOrder: sortOrder || 'desc',
                offset,
                perPage,
                observationTitle,
                search
            };

            // Fetch the assessments based on filters
            const assessments = await awarenessPillarModel.getFilteredAssessments(filterConditions);

            // Count total assessments for pagination
            const totalAssessment = await awarenessPillarModel.getTotalAssessments(filterConditions);

            // Calculate pagination info
            const totalPages = Math.ceil(totalAssessment / perPage);
            const result = {
                assessments,
                pagination: {
                    totalItems: totalAssessment,
                    totalPages,
                    currentPage,
                    perPage,
                },
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved Mindfulness pillar assessments.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    // get Autocomplete Task data
    async getAutocompleteTasks(req, res) {
        try {
            const userId = req.user.id;
            const { observationTitle } = req.query;

            const filterConditions = {
                userId,
                observationTitle: observationTitle, // Applying pattern for partial matching
            };

            // Fetch the experiences based on filters
            const tasks = await awarenessPillarModel.getAutocompleteTasks(filterConditions);

            const result = {
                tasks,
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved Mindfulness pillar Tasks.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    // get Autocomplete Assessment data
    async getAutocompleteAssessments(req, res) {
        try {
            const userId = req.user.id;
            const { observationTitle } = req.query;

            const filterConditions = {
                userId,
                observationTitle: observationTitle, // Applying pattern for partial matching
            };

            // Fetch the assessments based on filters
            const assessments = await awarenessPillarModel.getAutocompleteAssessments(filterConditions);

            const result = {
                assessments,
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved knowledge pillar Assessments.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

}

module.exports = new awarenessPillarController();
