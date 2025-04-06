const knowledgePillarModel = require('../../models/frontend/knowledgePillarModel');
const ResponseHelper = require('../../helpers/responseHelper');
const pdfcreator = require('../../public/pdf_puppeteer/pdfcreator');
class KnowledgePillarController {

    // Dashboard
    getDashboard = async (req, res) => {
        const userId = req.user.id;

        try {
            // Fetch total counts
            const experienceTotalCounts = await knowledgePillarModel.getTotalExperienceCounts(userId);
            const experienceTaskTotalCounts = await knowledgePillarModel.getTotalExperienceTaskCounts(userId);
            const experienceAssessmentTotalCounts = await knowledgePillarModel.getTotalExperienceAssessmentCounts(userId);

            const result = {
                experienceCount: experienceTotalCounts,
                experienceTaskCount: experienceTaskTotalCounts,
                experienceAssessmentCount: experienceAssessmentTotalCounts
            };
            return ResponseHelper.respond(200, true, result, 'Successfully retrieved knowledge pillar dashboard.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getRecentExperiences(req, res) {
        try {
            const search = req.query.search;
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

            // Fetch the experiences based on filters
            const experiences = await knowledgePillarModel.getRecentExperiences(filterConditions);

            // Count total experiences for pagination
            const totalExperiences = await knowledgePillarModel.getRecentTotalExperiences(filterConditions);

            // Calculate pagination info
            const totalPages = Math.ceil(totalExperiences / perPage);

            const result = {
                experiences,
                pagination: {
                    totalItems: totalExperiences,
                    totalPages,
                    currentPage,
                    perPage,
                },
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved knowledge pillar dashboard.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getRecentActiveTasks(req, res) {
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

            // Fetch the recent Experience Tasks
            const recentExperienceTasks = await knowledgePillarModel.getRecentExperiencesTasks(filterConditions);

            // Count total recent Experience Tasks for pagination
            const totalExperiencesTasks = await knowledgePillarModel.getRecentTotalExperiencesTasks(filterConditions);

            // Calculate pagination info
            const totalPages = Math.ceil(totalExperiencesTasks / perPage);

            const result = {
                recentExperienceTasks,
                pagination: {
                    totalItems: totalExperiencesTasks,
                    totalPages,
                    currentPage,
                    perPage,
                },
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved experiences task.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getRecentAssessments(req, res) {
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

            // Fetch the recent Experience assessments
            const recentExperienceAssessments = await knowledgePillarModel.getRecentExperiencesAssessments(filterConditions);

            // Count total recent Experience assessments for pagination
            const totalExperiencesAssessment = await knowledgePillarModel.getRecentTotalExperiencesAssessments(filterConditions);

            // Calculate pagination info
            const totalPages = Math.ceil(totalExperiencesAssessment / perPage);

            const result = {
                recentExperienceAssessments,
                pagination: {
                    totalItems: totalExperiencesAssessment,
                    totalPages,
                    currentPage,
                    perPage,
                },
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved experiences task.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    // get all experience
    async getAllExperience(req, res) {
        try {
            const userId = req.user.id;
            const search = req.query.search;
            const { fromDate, toDate, status, sortBy, sortOrder, page } = req.body;

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
            const experiences = await knowledgePillarModel.getFilteredExperiences(filterConditions);

            // Count total experiences for pagination
            const totalExperiences = await knowledgePillarModel.getTotalExperiences(filterConditions);

            // Calculate pagination info
            const totalPages = Math.ceil(totalExperiences / perPage);

            const result = {
                experiences,
                pagination: {
                    totalItems: totalExperiences,
                    totalPages,
                    currentPage,
                    perPage,
                },
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved knowledge pillar dashboard.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    // get all Tasks
    async getAllTasks(req, res) {       
        try {
            const userId = req.user.id;
            const search = req.query.search;
            const { fromDate, toDate, status, sortBy, sortOrder, page, experiencesTitle } = req.body;

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
                sortBy: sortBy || 'lbt.id',
                sortOrder: sortOrder || 'desc',
                offset,
                perPage,
                experiencesTitle,
                search
            };

            // Fetch the experiences based on filters
            const tasks = await knowledgePillarModel.getFilteredTasks(filterConditions);

            // Count total experiences for pagination
            const totalTasks = await knowledgePillarModel.getTotalTasks(filterConditions);

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

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved knowledge pillar Tasks.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    // get Autocomplete Task data
    async getAutocompleteTasks(req, res) {
        try {
            const userId = req.user.id;
            const { experiencesTitle } = req.query;

            const filterConditions = {
                userId,
                experiencesTitle: experiencesTitle, // Applying pattern for partial matching
            };

            // Fetch the experiences based on filters
            const tasks = await knowledgePillarModel.getAutocompleteTasks(filterConditions);

            const result = {
                tasks,
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved knowledge pillar Tasks.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    // get Autocomplete Assessment data
    async getAutocompleteAssessments(req, res) {
        try {
            const userId = req.user.id;
            const { experiencesTitle } = req.query;

            const filterConditions = {
                userId,
                experiencesTitle: experiencesTitle, // Applying pattern for partial matching
            };

            // Fetch the assessments based on filters
            const assessments = await knowledgePillarModel.getAutocompleteAssessments(filterConditions);

            const result = {
                assessments,
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved knowledge pillar Assessments.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }


    // get all assessments
    async getAllAssessments(req, res) {
        try {
            const userId = req.user.id;
            const search = req.query.search;
            const { fromDate, toDate, status, sortBy, sortOrder, page, experiencesTitle } = req.body;

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
                experiencesTitle,  // Add experiencesTitle
                search 
            };

            // Fetch the assessments based on filters
            const assessments = await knowledgePillarModel.getFilteredAssessments(filterConditions);

            // Count total assessments for pagination
            const totalAssessment = await knowledgePillarModel.getTotalAssessments(filterConditions);

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

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved knowledge pillar assessments.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    // create Experience
    async createExperience(req, res) {
        const { title, status, insights, notes, tasks, tags, files, assessment } = req.body;
        const validationErrors = {};

        // Validate input
        if (!title || !title.trim()) {
            validationErrors.title = 'The title field is required.';
        } else if (title.trim().length > 200) {
            validationErrors.title = 'The title field must be maximum 200 characters long.';
        }

        // Validate status field
        if (!status || !['0', '1', '2'].includes(status)) {
            validationErrors.status = 'Invalid value for status. It should be one of: 0, 1, 2.';
        }

        if (insights !== null && insights.length > 0) {
            const insightNames = insights.map(insight => insight.name);

            // Check if any insight name is empty
            const isEmptyInsight = insights.some(insight => !insight.name.trim());
            if (isEmptyInsight) {
                validationErrors.insights = 'Please fill out the insights field in all tabs. It is required to proceed.';
            } else {
                // Check if any insight name exceeds 200 characters
                const isOverLengthInsight = insights.some(insight => insight.name.trim().length > 5000);
                if (isOverLengthInsight) {
                    validationErrors.insights = 'Insight names must be maximum 5000 characters long.';
                } else {
                    // Check for uniqueness
                    const uniqueInsightNames = new Set(insightNames); // Using Set to ensure uniqueness
                    if (insightNames.length !== uniqueInsightNames.size) {
                        validationErrors.insights = 'Insight names must be unique.';
                    }
                }
            }
        }


        if (notes !== null && notes.length > 0) {
            const noteNames = notes.map(note => note.name);

            // Check if any note name is empty
            const isEmptyNote = notes.some(note => !note.name.trim());
            if (isEmptyNote) {
                validationErrors.notes = 'Please fill out the notes field in all tabs. It is required to proceed.';
            } else {
                // Check if any note name exceeds 200 characters
                const isOverLengthNote = notes.some(note => note.name.trim().length > 5000);
                if (isOverLengthNote) {
                    validationErrors.notes = 'Note names must be maximum 5000 characters long.';
                } else {
                    // Check for uniqueness
                    const uniqueNoteNames = new Set(noteNames); // Using Set to ensure uniqueness
                    if (noteNames.length !== uniqueNoteNames.size) {
                        validationErrors.notes = 'Note names must be unique.';
                    }
                }
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
                    validationErrors.assessment.did_progress_towards_life_purpose = 'Invalid value for progress towards life purpose.';
                }

                if (
                    assessmentData?.did_help_another_person &&
                    !['1', '0', '2'].includes(assessmentData?.did_help_another_person)
                ) {
                    validationErrors.assessment.did_help_another_person = 'Invalid value for help another person.';
                }

                if (assessmentData?.do_differently && !assessmentData.do_differently.trim()) {
                    validationErrors.assessment.do_differently = 'Invalid value for do differently.';
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
            const existingExperience = await knowledgePillarModel.getExperienceByNameAndUserId(title, userId);
            if (existingExperience.length > 0) {
                validationErrors.name = 'Insight title already exists.';
                return ResponseHelper.validateAndRespond(validationErrors, null, res);
            }

            const addExperience = {
                userId: userId,
                title: title,
                status: status,
                insights: insights,
                notes: notes,
                tasks: tasks,
                tags: tags,
                files: files,
                assessment: assessment,
            };

            const insertedExperienceData = await knowledgePillarModel.createExperience(addExperience);

            if (insertedExperienceData.success === false) {
                return ResponseHelper.respond(400, false, insertedExperienceData, 'Insight created failed!', res);
            } else {
                return ResponseHelper.respond(200, true, insertedExperienceData, 'Insight created successfully.', res);
            }

        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    async experienceFile(req, res) {
        try {
            const validationErrors = {};

            if (!req.file) {
                validationErrors.file = 'File is required.';
                return res.status(400).json({ success: false, data: { error: validationErrors } });
            }

            const file = req.file;

            return res.status(200).json({
                success: true,
                file: {
                    filename: file.key,
                    mimetype: file.mimetype,
                    size: file.size,
                    url: file.location, // Use the location property for URL
                    message: 'File uploaded successfully.'
                },
            });
        } catch (error) {
            console.error('Error in file upload:', error);
            return res.status(500).json({ success: false, data: { error: { file: 'File upload failed.' } } });
        }
    }


    // get Experience User Wise
    async getExperienceUserWise(req, res) {
        try {
            const userId = req.user.id;
            const experienceId = req.params.id;

            const data = await knowledgePillarModel.GetExperienceUserById(userId, experienceId);

            if (!data || data.length === 0) {
                return ResponseHelper.respond(404, false, { error: { message: 'Data not found!' } }, 'Data not found!', res);
            }

            // Extract the object from the array if it's wrapped in one
            const responseData = Array.isArray(data) ? data[0] : data;

            return ResponseHelper.respond(200, true, responseData, 'Successfully retrieved experience data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getExperienceUserWisePDF(req, res) {
        try {
            const userId = req.user.id;
            const experienceId = req.params.id;

            const data = await knowledgePillarModel.GetExperienceUserByIdForPrint(userId, experienceId);

            if (!data || data.length === 0) {
                return ResponseHelper.respond(404, false, { error: { message: 'Data not found!' } }, 'Data not found!', res);
            }
                const responseData = Array.isArray(data) ? data[0] : data;

                const fileurl = await pdfcreator.generatePDF(responseData);     

            return ResponseHelper.respond(200, true, fileurl, 'Successfully retrieved experience data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: error }, null, res);
        }
    }


    async updateExperienceUserWise(req, res) {
        const { id } = req.params;
        const userId = req.user.id;
        const { title, status, insights, notes, tasks, tags, files, assessment } = req.body;
        const validationErrors = {};

        // Validate input
        if (!title || !title.trim()) {
            validationErrors.title = 'The title field is required.';
        }

        // Validate status field
        if (!status || !['0', '1', '2'].includes(status)) {
            validationErrors.status = 'Invalid value for status. It should be one of: 0, 1, 2.';
        }

        // Validate input
        if (!title || !title.trim()) {
            validationErrors.title = 'The title field is required.';
        } else if (title.trim().length > 200) {
            validationErrors.title = 'The title field must be maximum 200 characters long.';
        }

        // Validate status field
        if (!status || !['0', '1', '2'].includes(status)) {
            validationErrors.status = 'Invalid value for status. It should be one of: 0, 1, 2.';
        }

        if (insights !== null && insights.length > 0) {
            const insightNames = insights.map(insight => insight.name);

            // Check if any insight name is empty
            const isEmptyInsight = insights.some(insight => !insight.name.trim());
            if (isEmptyInsight) {
                validationErrors.insights = 'Please fill out the insights field in all tabs. It is required to proceed.';
            } else {
                // Check if any insight name exceeds 200 characters
                const isOverLengthInsight = insights.some(insight => insight.name.trim().length > 5000);
                if (isOverLengthInsight) {
                    validationErrors.insights = 'Insight names must be maximum 5000 characters long.';
                } else {
                    // Check for uniqueness
                    const uniqueInsightNames = new Set(insightNames); // Using Set to ensure uniqueness
                    if (insightNames.length !== uniqueInsightNames.size) {
                        validationErrors.insights = 'Insight names must be unique.';
                    }
                }
            }
        }


        if (notes !== null && notes.length > 0) {
            const noteNames = notes.map(note => note.name);

            // Check if any note name is empty
            const isEmptyNote = notes.some(note => !note.name.trim());
            if (isEmptyNote) {
                validationErrors.notes = 'Please fill out the notes field in all tabs. It is required to proceed.';
            } else {
                // Check if any note name exceeds 200 characters
                const isOverLengthNote = notes.some(note => note.name.trim().length > 5000);
                if (isOverLengthNote) {
                    validationErrors.notes = 'Note names must be maximum 5000 characters long.';
                } else {
                    // Check for uniqueness
                    const uniqueNoteNames = new Set(noteNames); // Using Set to ensure uniqueness
                    if (noteNames.length !== uniqueNoteNames.size) {
                        validationErrors.notes = 'Note names must be unique.';
                    }
                }
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
                if (!/^[1-8]$/.test(assessmentData?.grade.trim())) {
                    validationErrors.assessment.grade = 'Invalid value for grade. Must be a letter between A and F.';
                }

                if (
                    assessmentData?.did_progress_towards_life_purpose &&
                    !['1', '0'].includes(assessmentData?.did_progress_towards_life_purpose)
                ) {
                    validationErrors.assessment.did_progress_towards_life_purpose = 'Invalid value for progress towards life purpose.';
                }

                if (
                    assessmentData?.did_help_another_person &&
                    !['1', '0', '2'].includes(assessmentData?.did_help_another_person)
                ) {
                    validationErrors.assessment.did_help_another_person = 'Invalid value for help another person.';
                }

                if (assessmentData?.do_differently && !assessmentData.do_differently.trim()) {
                    validationErrors.assessment.do_differently = 'Invalid value for do differently.';
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
            const existingExperience = await knowledgePillarModel.getExperienceByName(title, userId, id);
            if (existingExperience.length > 0) {
                validationErrors.name = 'Insight title already exists.';
                return ResponseHelper.validateAndRespond(validationErrors, null, res);
            }

            const updateExperienceData = {
                userId,
                id,
                title,
                status,
                insights,
                notes,
                tasks,
                tags,
                files,
                assessment
            };

            const updatedExperienceData = await knowledgePillarModel.updateExperienceUserWise(updateExperienceData);
            const experinceid = updatedExperienceData.id;
            const allTasksComplete = updatedExperienceData.tasks.every(task => task.status === 1);

                if (allTasksComplete) {
                    await knowledgePillarModel.Updateis_completed_task(experinceid,"1");
                } else {
                    await knowledgePillarModel.Updateis_completed_task(experinceid,"0");
                }

                // Optionally, log the total length of tasks for verification
                const totalTasks = updatedExperienceData.tasks.length;
            
            if (updatedExperienceData.success === false) {
                return ResponseHelper.respond(400, false, updatedExperienceData, 'Insight update failed!', res);
            } else {
                return ResponseHelper.respond(200, true, updatedExperienceData, 'Insight updated successfully.', res);
            }

        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    async updateTaskStatus(req, res) {
        const { id } = req.params;
        const { status } = req.body;

        const validationErrors = {};

        if (!status || status.length === 0) {
            validationErrors.status = 'status is required.';
        }

        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({ success: false, data: { error: validationErrors } });
        }

        try {
            const updateTaskStatusData = {
                id,
                status,
            };

            const updatedTaskStatus = await knowledgePillarModel.updateTaskStatusData(updateTaskStatusData);

            if (updatedTaskStatus.success === false) {
                return ResponseHelper.respond(400, false, updatedTaskStatus, 'Task status updated failed!', res);
            } else {
                return ResponseHelper.respond(200, true, updatedTaskStatus, 'Task status updated successfully.', res);
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    async deleteExperience(req, res) {
        const { id } = req.params;
        try {
            const deleteExperienceData = {
                id
            };

            const deleteExperience = await knowledgePillarModel.deleteExperience(deleteExperienceData);

            if (deleteExperience.success === false) {
                return ResponseHelper.respond(400, false, deleteExperience, 'Experience delete failed!', res);
            } else {
                return ResponseHelper.respond(200, true, deleteExperience, 'Experience delete successfully.', res);
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    // In your KnowledgePillarController
    async deleteTask(req, res) {
        const { id } = req.params;
        try {
            const deleteTaskResult = await knowledgePillarModel.deleteTask({ id });
            if (deleteTaskResult.success === false) {
                return ResponseHelper.respond(400, false, deleteTaskResult, 'Task deletion failed!', res);
            } else {
                return ResponseHelper.respond(200, true, deleteTaskResult, 'Task deleted successfully.', res);
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

}

module.exports = new KnowledgePillarController();
