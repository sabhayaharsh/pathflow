const decisionPillarModel = require('../../models/frontend/decisionPillarModel');
const ResponseHelper = require('../../helpers/responseHelper');
const pdfcreator = require('../../public/pdf_puppeteer/pdfcreator');
class DecisionPillarController {
    // Dashboard
    getDashboard = async (req, res) => {
        const userId = req.user.id;

        try {
            // Fetch total counts
            const opportunityTotalCounts = await decisionPillarModel.getTotalOppertunityCounts(userId);
            const opportunityTaskTotalCounts = await decisionPillarModel.getTotalOppertunityTaskCounts(userId);
            const opportunityAssessmentTotalCounts = await decisionPillarModel.getTotalOppertunityAssessmentCounts(userId);

            const result = {
                opportunityCount: opportunityTotalCounts,
                opportunityTaskCount: opportunityTaskTotalCounts,
                opportunityAssessmentCount: opportunityAssessmentTotalCounts
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved decision pillar dashboard.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getRecentOpportunities(req, res) {
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

            // Fetch the opportunities based on filters
            const recentOpportunity = await decisionPillarModel.getRecentOpportunities(filterConditions);

            // Count total opportunities for pagination
            const totalOpportunities = await decisionPillarModel.getRecentTotalOpportunities(filterConditions);

            // Calculate pagination info
            const totalPages = Math.ceil(totalOpportunities / perPage);

            const result = {
                recentOpportunity,
                pagination: {
                    totalItems: totalOpportunities,
                    totalPages,
                    currentPage,
                    perPage,
                },
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved recent Opportunities.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getRecentOpportunityTasks(req, res) {
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

            // Fetch the opportunity tasks based on filters
            const recentOpportunityTasks = await decisionPillarModel.getRecentOpportunityTaks(filterConditions);

            // Count total opportunity tasks for pagination
            const totalTasks = await decisionPillarModel.getRecentTotalOpportunityTasks(filterConditions);

            // Calculate pagination info
            const totalPages = Math.ceil(totalTasks / perPage);

            const result = {
                recentOpportunityTasks,
                pagination: {
                    totalItems: totalTasks,
                    totalPages,
                    currentPage,
                    perPage,
                },
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved recent opportunity tasks.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getRecentOpportunityAssessments(req, res) {
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

            // Fetch the opportunity assessments based on filters
            const recentOpportunityAssessments = await decisionPillarModel.getRecentOpportunityAssessments(filterConditions);

            // Count total opportunity assessments for pagination
            const totalAssessments = await decisionPillarModel.getRecentTotalOpportunityAssessments(filterConditions);

            // Calculate pagination info
            const totalPages = Math.ceil(totalAssessments / perPage);

            const result = {
                recentOpportunityAssessments,
                pagination: {
                    totalItems: totalAssessments,
                    totalPages,
                    currentPage,
                    perPage,
                },
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved recent opportunity assessments.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    // create Oppertunity
    async createOppertunity(req, res) {
        const { title, status, goals, successCriteria, options, decision, tags, tasks, files, assessment } = req.body;
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

        if (goals !== null && goals.length > 0) {
            const name = goals.map(goal => goal.name);
            const description = goals.map(goal => goal.description);

            // Check if any goal title is empty
            const isEmptyGoalTitle = goals.some(goal => !goal.name.trim());
            if (isEmptyGoalTitle) {
                validationErrors.name = 'Please fill out the name field in all goals. It is required to proceed.';
            } else {
                // Check if any goal title exceeds the maximum length
                const isOverLengthGoalTitle = goals.some(goal => goal.name.trim().length > 200);
                if (isOverLengthGoalTitle) {
                    validationErrors.name = 'Goal names must be maximum 200 characters long.';
                } else {
                    // Check for uniqueness in goal titles
                    const uniqueGoalTitles = new Set(name);
                    if (name.length !== uniqueGoalTitles.size) {
                        validationErrors.name = 'Goal names must be unique.';
                    }
                }
            }

            // Check if any goal detail is empty
            const isEmptyGoalDetail = goals.some(goal => !goal.description.trim());
            if (isEmptyGoalDetail) {
                validationErrors.description = 'Please fill out the description field in all goals. It is required to proceed.';
            } else {
                // Check if any goal detail exceeds the maximum length
                const isOverLengthGoalDetail = goals.some(goal => goal.description.trim().length > 5000);
                if (isOverLengthGoalDetail) {
                    validationErrors.description = 'Goal description must be maximum 5000 characters long.';
                } else {
                    const uniqueGoalDescription = new Set(description);
                    if (description.length !== uniqueGoalDescription.size) {
                        validationErrors.description = 'Goal description must be unique.';
                    }
                }
            }
        }

        if (successCriteria !== null && successCriteria?.length > 0) {
            const criteriaErrors = {};
            const validationErrors = {};

            const criteriaTitles = successCriteria?.map(criteria => criteria.name);

            // Check if any criteriaTitle is empty
            const isEmptyCriteriaTitle = successCriteria.some(criteria => !criteria?.name?.trim());
            if (isEmptyCriteriaTitle) {
                criteriaErrors.name = 'Please fill out the name field in all criteria. It is required to proceed.';
            } else {
                // Check for uniqueness in name
                const uniqueCriteriaTitles = new Set(criteriaTitles);
                if (criteriaTitles.length !== uniqueCriteriaTitles.size) {
                    criteriaErrors.name = 'Criteria name must be unique.';
                }

                // Check for length of name
                const isOverLengthCriteriaTitle = successCriteria.some(criteria => criteria?.name.trim().length > 200);
                if (isOverLengthCriteriaTitle) {
                    criteriaErrors.name = 'Criteria name must be maximum 200 characters long.';
                }
            }

            successCriteria.forEach((criteria, index) => {
                // Check if importance (or importance) is provided and its value is either "Must Have" or "Should Have"
                const importance = criteria?.importance || criteria?.importance;
                if (!['1', '2'].includes(importance?.toLowerCase())) {
                    criteriaErrors.importance = 'Please fill out the success criteria field in all options. It should be either "Must Have" or "Should Have".';
                }

                // Check if priority is provided and its value is one of the allowed options
                if (!criteria?.priority || !['1', '2', '3'].includes(criteria?.priority)) {
                    criteriaErrors.priority = 'Please fill out the priority field in all options. It should be one of: "High", "Medium", "Low".';
                }
            });

            // Return criteriaErrors if any
            if (Object.keys(criteriaErrors).length > 0) {
                validationErrors.errors = criteriaErrors;
                return res.status(400).json({ success: false, data: { error: criteriaErrors } });
            }
        }


        if (options !== null && options.length > 0) {
            const name = options.map(option => option.name);

            // Check if any name is empty
            const isEmptyOptionsTitle = options.some(option => !option.name.trim());
            if (isEmptyOptionsTitle) {
                validationErrors.options = 'Please fill out the name field in all options. It is required to proceed.';
            } else {
                // Check for uniqueness in name
                const uniqueOptionsTitles = new Set(name);
                if (name.length !== uniqueOptionsTitles.size) {
                    validationErrors.options = 'Options name must be unique.';
                }
            }

            // Check for length of name
            const isOverLengthOptionsTitle = options.some(option => option.name.trim().length > 200);
            if (isOverLengthOptionsTitle) {
                validationErrors.options = 'Options name must be maximum 200 characters long.';
            }
        }

        if (decision !== null && decision.length > 0) {
            // Extract decisionDetails and reason from the decision array
            const name = decision.map(item => item.name);
            const reason = decision.map(item => item.reason);

            // Check for empty name and reasonDetail
            const isEmptyDecisionDetail = decision.some(item => !item.name?.trim());
            const isEmptyReasonDetail = decision.some(item => !item.reason?.trim());

            if (isEmptyDecisionDetail) {
                validationErrors.name = 'Please fill out the name field in all decision items. It is required to proceed.';
            } else if (isEmptyReasonDetail) {
                validationErrors.reasonDetail = 'Please fill out the reason field in all decision items. It is required to proceed.';
            } else {
                // Check for maximum length of decisionDetail and reasonDetail
                const isOverLengthDecisionDetail = decision.some(item => item.name?.trim().length > 200);
                const isOverLengthReasonDetail = decision.some(item => item.reason?.trim().length > 200);

                if (isOverLengthDecisionDetail) {
                    validationErrors.name = 'Decision name must be maximum 200 characters long.';
                }

                if (isOverLengthReasonDetail) {
                    validationErrors.reason = 'Reason description must be maximum 200 characters long.';
                }

                // Check for uniqueness of name and reason
                const uniqueDecisionDetails = new Set(name);
                const uniqueReason = new Set(reason);

                if (name.length !== uniqueDecisionDetails.size) {
                    validationErrors.name = 'Decision title must be unique.';
                }

                if (reason.length !== uniqueReason.size) {
                    validationErrors.reason = 'Decision description must be unique.';
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
            const isBelowLengthTag = tags.some(tag => tag.name?.trim().length > 10);
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

            const existingExperience = await decisionPillarModel.getOpportunityByNameAndUserId(title, userId);
            if (existingExperience.length > 0) {
                validationErrors.name = 'Decision title already exists.';
                return ResponseHelper.validateAndRespond(validationErrors, null, res);
            }

            const addExperience = {
                userId: userId,
                title: title,
                status: status,
                goals: goals,
                successCriteria: successCriteria,
                options: options,
                decision: decision,
                tags: tags,
                files: files,
                tasks: tasks,
                assessment: assessment,
            };

            const insertedOppertunityData = await decisionPillarModel.createOpportunity(addExperience);

            if (insertedOppertunityData.success === false) {
                return ResponseHelper.respond(400, false, insertedOppertunityData, 'Decision created failed!', res);
            } else {
                return ResponseHelper.respond(200, true, insertedOppertunityData, 'Decision created successfully.', res);
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    // get Experience User Wise
    async getOpportunityIDWise(req, res) {
        try {
            const userId = req.user.id;
            const opportunityId = req.params.id;

            const data = await decisionPillarModel.GetOpportunityIdWise(userId, opportunityId);

            if (!data || data.length === 0) {
                return ResponseHelper.respond(404, false, { error: { message: 'Data not found!' } }, 'Data not found!', res);
            }

            // Extract the object from the array if it's wrapped in one
            const responseData = Array.isArray(data) ? data[0] : data;

            return ResponseHelper.respond(200, true, responseData, 'Successfully retrieved Decision data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }


    async getOpportunityPdfPrint(req, res) {
        try {
            const userId = req.user.id;
            const opportunityId = req.params.id;

            const data = await decisionPillarModel.GetOpportunityPdfPrint(userId, opportunityId);

            if (!data || data.length === 0) {
                return ResponseHelper.respond(404, false, { error: { message: 'Data not found!' } }, 'Data not found!', res);
            }

            // Extract the object from the array if it's wrapped in one
            const responseData = Array.isArray(data) ? data[0] : data;
            const fileurl = await pdfcreator.decisionpdfexport(responseData);  

            return ResponseHelper.respond(200, true, fileurl, 'Successfully retrieved Decision data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }


    async updateOppertunity(req, res) {
        const { id } = req.params;
        const userId = req.user.id;
        const { title, status, goals, successCriteria, options, decision, tasks, tags, files, assessment } = req.body;
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

        if (goals !== null && goals.length > 0) {
            const name = goals.map(goal => goal.name);
            const description = goals.map(goal => goal.description);

            // Check if any goal title is empty
            const isEmptyGoalTitle = goals.some(goal => !goal.name.trim());
            if (isEmptyGoalTitle) {
                validationErrors.name = 'Please fill out the name field in all goals. It is required to proceed.';
            } else {
                // Check if any goal title exceeds the maximum length
                const isOverLengthGoalTitle = goals.some(goal => goal.name.trim().length > 200);
                if (isOverLengthGoalTitle) {
                    validationErrors.name = 'Goal names must be maximum 200 characters long.';
                } else {
                    // Check for uniqueness in goal titles
                    const uniqueGoalTitles = new Set(name);
                    if (name.length !== uniqueGoalTitles.size) {
                        validationErrors.name = 'Goal names must be unique.';
                    }
                }
            }

            // Check if any goal detail is empty
            const isEmptyGoalDetail = goals.some(goal => !goal.description.trim());
            if (isEmptyGoalDetail) {
                validationErrors.description = 'Please fill out the description field in all goals. It is required to proceed.';
            } else {
                // Check if any goal detail exceeds the maximum length
                const isOverLengthGoalDetail = goals.some(goal => goal.description.trim().length > 5000);
                if (isOverLengthGoalDetail) {
                    validationErrors.description = 'Goal description must be maximum 5000 characters long.';
                } else {
                    const uniqueGoalDescription = new Set(description);
                    if (description.length !== uniqueGoalDescription.size) {
                        validationErrors.description = 'Goal description must be unique.';
                    }
                }
            }
        }

        // Validate successCriteria
        if (successCriteria !== null && successCriteria?.length > 0) {
            const criteriaErrors = {};
            const validationErrors = {};

            const criteriaTitles = successCriteria.map(criteria => criteria?.name);

            // Check if any criteriaTitle is empty
            const isEmptyCriteriaTitle = successCriteria.some(criteria => !criteria?.name?.trim());
            if (isEmptyCriteriaTitle) {
                criteriaErrors.name = 'Please fill out the name field in all criteria. It is required to proceed.';
            } else {
                // Check for uniqueness in name
                const uniqueCriteriaTitles = new Set(criteriaTitles);
                if (criteriaTitles?.length !== uniqueCriteriaTitles?.size) {
                    criteriaErrors.name = 'Criteria name must be unique.';
                }

                // Check for length of name
                const isOverLengthCriteriaTitle = successCriteria.some(criteria => criteria?.name.trim().length > 200);
                if (isOverLengthCriteriaTitle) {
                    criteriaErrors.name = 'Criteria name must be maximum 200 characters long.';
                }
            }

            successCriteria.forEach((criteria, index) => {
                // Check if importance (or importance) is provided and its value is either "Must Have" or "Should Have"
                const importance = criteria?.importance || criteria?.importance;
                if (!['1', '2'].includes(importance.toLowerCase())) {
                    criteriaErrors.importance = 'Please fill out the success criteria field in all options. It should be either "Must Have" or "Should Have".';
                }

                // Check if priority is provided and its value is one of the allowed options
                if (!criteria?.priority || !['1', '2', '3'].includes(criteria?.priority)) {
                    criteriaErrors.priority = 'Please fill out the priority field in all options. It should be one of: "High", "Medium", "Low".';
                }
            });

            // Return criteriaErrors if any
            if (Object.keys(criteriaErrors).length > 0) {
                validationErrors.errors = criteriaErrors;
                return res.status(400).json({ success: false, data: { error: criteriaErrors } });
            }
        }

        if (options !== null && options.length > 0) {
            const name = options.map(option => option.name);

            // Check if any name is empty
            const isEmptyOptionsTitle = options.some(option => !option.name.trim());
            if (isEmptyOptionsTitle) {
                validationErrors.options = 'Please fill out the name field in all options. It is required to proceed.';
            } else {
                // Check for uniqueness in name
                const uniqueOptionsTitles = new Set(name);
                if (name.length !== uniqueOptionsTitles.size) {
                    validationErrors.options = 'Options name must be unique.';
                }
            }

            // Check for length of name
            const isOverLengthOptionsTitle = options.some(option => option.name.trim().length > 200);
            if (isOverLengthOptionsTitle) {
                validationErrors.options = 'Options name must be maximum 200 characters long.';
            }
        }

        if (decision !== null && decision.length > 0) {
            // Extract decisionDetails and reason from the decision array
            const name = decision.map(item => item.name);
            const reason = decision.map(item => item.reason);

            // Check for empty name and reasonDetail
            const isEmptyDecisionDetail = decision.some(item => !item.name?.trim());
            const isEmptyReasonDetail = decision.some(item => !item.reason?.trim());

            if (isEmptyDecisionDetail) {
                validationErrors.name = 'Please fill out the name field in all decision items. It is required to proceed.';
            } else if (isEmptyReasonDetail) {
                validationErrors.reasonDetail = 'Please fill out the reason field in all decision items. It is required to proceed.';
            } else {
                // Check for maximum length of decisionDetail and reasonDetail
                const isOverLengthDecisionDetail = decision.some(item => item.name?.trim().length > 200);
                const isOverLengthReasonDetail = decision.some(item => item.reason?.trim().length > 200);

                if (isOverLengthDecisionDetail) {
                    validationErrors.name = 'Decision name must be maximum 200 characters long.';
                }

                if (isOverLengthReasonDetail) {
                    validationErrors.reason = 'Reason description must be maximum 200 characters long.';
                }

                // Check for uniqueness of name and reason
                const uniqueDecisionDetails = new Set(name);
                const uniqueReason = new Set(reason);

                if (name.length !== uniqueDecisionDetails.size) {
                    validationErrors.name = 'Decision title must be unique.';
                }

                if (reason.length !== uniqueReason.size) {
                    validationErrors.reason = 'Decision description must be unique.';
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
            const isBelowLengthTag = tags.some(tag => tag.name?.trim().length > 10);
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
            const url = req.protocol + '://' + req.get('host');
            const existingOpportunity = await decisionPillarModel.getOpportunityByName(title, userId, id);
            if (existingOpportunity.length > 0) {
                validationErrors.name = 'Decision title already exists.';
                return ResponseHelper.validateAndRespond(validationErrors, null, res);
            }

            const updateOppertunityData = {
                userId,
                id,
                title,
                status,
                goals,
                successCriteria,
                options,
                decision,
                tasks,
                tags,
                files,
                assessment
            };

            const updatedOppertunityData = await decisionPillarModel.updateOppertunity(updateOppertunityData, url);

            const experinceid = updatedOppertunityData.id;
            const allTasksComplete = updatedOppertunityData.tasks.every(task => task.status === 1);

            if (allTasksComplete) {
                await decisionPillarModel.Updateis_completed_task(experinceid, "1");
            } else {
                await decisionPillarModel.Updateis_completed_task(experinceid, "0");
            }

            // Optionally, log the total length of tasks for verification
            const totalTasks = updatedOppertunityData.tasks.length;
            if (updatedOppertunityData.success === false) {
                return ResponseHelper.respond(400, false, updatedOppertunityData, 'Decision update failed!', res);
            } else {
                return ResponseHelper.respond(200, true, updatedOppertunityData, 'Decision updated successfully.', res);
            }

        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    async deleteOpportunity(req, res) {
        const { id } = req.params;
        try {
            const deleteOpportunityData = {
                id
            };

            const deleteOpportunity = await decisionPillarModel.deleteOppertunity(deleteOpportunityData);

            if (deleteOpportunity.success === false) {
                return ResponseHelper.respond(400, false, deleteOpportunity, 'Opportunity delete failed!', res);
            } else {
                return ResponseHelper.respond(200, true, deleteOpportunity, 'Opportunity delete successfully.', res);
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    // get all experience
    async getAllOppertunity(req, res) {
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
            const oppertunities = await decisionPillarModel.getFilteredOppertunities(filterConditions);

            // Count total experiences for pagination
            const totalOpportunities = await decisionPillarModel.getTotalOppertunities(filterConditions);

            // Calculate pagination info
            const totalPages = Math.ceil(totalOpportunities / perPage);

            const result = {
                oppertunities,
                pagination: {
                    totalItems: totalOpportunities,
                    totalPages,
                    currentPage,
                    perPage,
                },
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved all oppertunity data.', res);
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
            const { fromDate, toDate, status, sortBy, sortOrder, page, oppertunityTitle } = req.body;

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
                oppertunityTitle,
                search
            };

            // Fetch the experiences based on filters
            const tasks = await decisionPillarModel.getFilteredTasks(filterConditions);

            // Count total experiences for pagination
            const totalTasks = await decisionPillarModel.getTotalTasks(filterConditions);

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

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved Decision pillar Tasks.', res);
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
            const { fromDate, toDate, status, sortBy, sortOrder, page, oppertunityTitle } = req.body;

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
                oppertunityTitle,
                search
            };

            // Fetch the assessments based on filters
            const assessments = await decisionPillarModel.getFilteredAssessments(filterConditions);

            // Count total assessments for pagination
            const totalAssessment = await decisionPillarModel.getTotalAssessments(filterConditions);

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

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved decision pillar assessments.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    // get Autocomplete Task data
    async getAutocompleteTasks(req, res) {
        try {
            const userId = req.user.id;
            const { oppertunityTitle } = req.query;

            const filterConditions = {
                userId,
                oppertunityTitle: oppertunityTitle, // Applying pattern for partial matching
            };

            // Fetch the experiences based on filters
            const tasks = await decisionPillarModel.getAutocompleteTasks(filterConditions);

            const result = {
                tasks,
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved observation Tasks.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    // get Autocomplete Assessment data
    async getAutocompleteAssessments(req, res) {
        try {
            const userId = req.user.id;
            const { oppertunityTitle } = req.query;

            const filterConditions = {
                userId,
                oppertunityTitle: oppertunityTitle, // Applying pattern for partial matching
            };

            // Fetch the assessments based on filters
            const assessments = await decisionPillarModel.getAutocompleteAssessments(filterConditions);

            const result = {
                assessments,
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved observation Assessments.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }


}

module.exports = new DecisionPillarController();
