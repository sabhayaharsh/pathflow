const journalModel = require('../../models/frontend/journalModel');
const ResponseHelper = require('../../helpers/responseHelper');
class JournalController {

    // create Journal
    async createJournal(req, res) {
        const { title, status, content, tags, files, type, created_at } = req.body;
        const validationErrors = {};

        if (!title || !title.trim()) {
            validationErrors.title = 'The title field is required.';
        } else if (title.trim().length > 200) {
            validationErrors.title = 'The title field must be maximum 200 characters long.';
        }

        if (!status || !['0', '1', '2'].includes(status)) {
            validationErrors.status = 'Invalid value for status. It should be one of: 0, 1, 2.';
        }

        if (!content || !content.trim()) {
            validationErrors.content = 'The description field is required.';
        } else if (content.trim().length > 5000) {
            validationErrors.content = 'The description field must be maximum 5000 characters long.';
        }

        if (tags !== null && tags.length > 0) {
            const tagNames = tags.map(tag => tag.name);

            const isBelowLengthTag = tags.some(tag => tag.name.trim().length > 10);
            if (isBelowLengthTag) {
                validationErrors.tags = 'Tag name must be at least 10 characters long.';
            } else {
                const uniqueTagNames = new Set(tagNames);
                if (tagNames.length !== uniqueTagNames.size) {
                    validationErrors.tags = 'Tag name must be unique.';
                }
            }
        }

        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({ success: false, data: { error: validationErrors } });
        }

        try {
            const userId = req.user.id;
            const existingJournal = await journalModel.getJournalByNameAndUserId(title, userId);
            if (existingJournal.length > 0) {
                validationErrors.name = 'Journal title already exists.';
                return ResponseHelper.validateAndRespond(validationErrors, null, res);
            }

            if (type == '1') {
                const existingExperience = await journalModel.getExperienceByNameAndUserId(title, userId);
                if (existingExperience.length > 0) {
                    validationErrors.name = 'Insight  already exists.';
                    return ResponseHelper.validateAndRespond(validationErrors, null, res);
                }
            }

            const addJournal = {
                userId: userId,
                title: title,
                status: status,
                content: content,
                tags: tags,
                files: files,
                type: type,
                created_at: created_at
            };

            const insertedJournalData = await journalModel.createJournal(addJournal);

            if (insertedJournalData.success === false) {
                const failureMessage = type == '1'
                    ? 'Journal or Insight creation failed!'
                    : 'Journal creation failed!';
                return ResponseHelper.respond(400, false, insertedJournalData, failureMessage, res);
            } else {
                const successMessage = type == "1"
                    ? 'Journal and Insight both are created successfully.'
                    : 'Journal created successfully.';
                return ResponseHelper.respond(200, true, insertedJournalData, successMessage, res);
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    async createJournalLibraryFile(req, res) {
        const userId = req.user.id;
        try {
            const validationErrors = {};

            if (!req.file) {
                validationErrors.file = 'File is required.';
                return res.status(400).json({ success: false, data: { error: validationErrors } });
            }
            const file = req.file;
            const insertData = {
                userId: userId,
                original_filename: file.originalname,
                name: file.key,
                url: file.location,
                type: file.mimetype,
                size: file.size.toString(),
            };

            const insertId = await journalModel.insertJournalImageLibrary(insertData);

            return res.status(200).json({
                success: true,
                file: {
                    id: insertId, // Return the database ID
                    original_filename: file.originalname,
                    name: file.key,
                    mimetype: file.mimetype,
                    size: file.size,
                    url: file.location,
                    message: 'File uploaded successfully.'
                },
            });
        } catch (error) {
            console.error('Error in file upload:', error);
            return res.status(500).json({ success: false, data: { error: { file: 'File upload failed.' } } });
        }
    }

    async journalFile(req, res) {
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
                    original_filename: file.originalname,
                    name: file.key,
                    mimetype: file.mimetype,
                    size: file.size,
                    url: file.location, // Use the location property for URL
                    type: '0',
                    message: 'File uploaded successfully.'
                },
            });
        } catch (error) {
            console.error('Error in file upload:', error);
            return res.status(500).json({ success: false, data: { error: { file: 'File upload failed.' } } });
        }
    }

    // get all Journal images
    async getAllJournalImages(req, res) {
        try {
            const userId = req?.user?.id;
            const { status = '1', sortBy = 'created_at', sortOrder = 'DESC', page } = req.body;

            const perPage = 36;
            const currentPage = page ? parseInt(page) : 1;
            const offset = (currentPage - 1) * perPage;

            const filterConditions = {
                userId,
                status,
                sortBy,
                sortOrder,
                offset,
                perPage,
            };

            const journalImages = await journalModel.getFilteredJournalImages(filterConditions);

            const totalJournalImages = await journalModel.getTotalJournalImages(filterConditions);

            const totalPages = Math.ceil(totalJournalImages / perPage);

            const result = {
                journalImages,
                pagination: {
                    totalItems: totalJournalImages,
                    totalPages,
                    currentPage,
                    perPage,
                },
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved all journal Images', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    // Get All Journal Images List
    async getAllJournalImagesList(req, res) {
        try {
            const userId = req?.user?.id;
            const { status = '1', sortBy = 'created_at', sortOrder = 'DESC', page } = req.body;

            const perPage = 50;
            const currentPage = page ? parseInt(page) : 1;
            const offset = (currentPage - 1) * perPage;

            const filterConditions = {
                userId,
                status,
                sortBy,
                sortOrder,
                offset,
                perPage,
            };

            const journalImages = await journalModel.getFilteredJournalImages(filterConditions);

            const totalJournalImages = await journalModel.getTotalJournalImages(filterConditions);

            const totalPages = Math.ceil(totalJournalImages / perPage);

            const result = {
                journalImages,
                pagination: {
                    totalItems: totalJournalImages,
                    totalPages,
                    currentPage,
                    perPage,
                },
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved all journal Images', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    // Get All Journal
    async getAllJournals(req, res) {
        try {
            const userId = req.user.id;
            const search = req.query.search;
            const { fromDate, toDate, status, sortBy, sortOrder, page, journalTitle } = req.body;

            const perPage = 10;
            const currentPage = page ? parseInt(page) : 1;
            const offset = (currentPage - 1) * perPage;

            const filterConditions = {
                userId,
                fromDate,
                toDate,
                status: '1',
                sortBy: sortBy,
                sortOrder: sortOrder,
                offset,
                perPage,
                journalTitle,
                search,
            };

            const journals = await journalModel.getFilteredJournals(filterConditions);
            const totalJournals = await journalModel.getTotalJournals(filterConditions);

            const flattenedJournals = journals.map(journal => {
                const date = new Date(journal.created_at);
                const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
                const formattedDate = `${date.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                })} | ${date.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                })}`;

                return {
                    ...journal,
                    created_at: formattedDate,
                    date: monthYear,
                };
            });

            const sortedJournals = sortJournals(flattenedJournals, sortBy, sortOrder);
            function sortJournals(journals, sortBy, sortOrder) {
                const months = {
                    January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
                    July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
                };

                const sortByFields = sortBy.split(',');
                const sortOrders = sortOrder.split(',');

                return journals.sort((a, b) => {
                    for (let i = 0; i < sortByFields.length; i++) {
                        const field = sortByFields[i];
                        const order = sortOrders[i] === 'asc' ? 1 : -1;

                        if (field === 'date') {
                            const [monthA, yearA] = a.date.split(" ");
                            const [monthB, yearB] = b.date.split(" ");
                            const yearComparison = (parseInt(yearB) - parseInt(yearA)) * order;
                            if (yearComparison !== 0) return yearComparison;

                            const monthComparison = (months[monthB] - months[monthA]) * order;
                            if (monthComparison !== 0) return monthComparison;
                        }

                        if (field === 'title') {
                            const titleComparison = a.journalTitle.localeCompare(b.journalTitle) * order;
                            if (titleComparison !== 0) return titleComparison;
                        }
                    }
                    return 0; // If all comparisons are equal
                });
            }


            const totalPages = Math.ceil(totalJournals / perPage);

            const result = {
                groupedJournals: sortedJournals,
                pagination: {
                    totalItems: totalJournals,
                    totalPages,
                    currentPage,
                    perPage,
                },
            };

            return ResponseHelper.respond(200, true, result, 'Successfully retrieved all journals', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async deleteJournal(req, res) {
        const { id } = req.params;
        try {
            const deleteJournalResult = await journalModel.deleteJournal({ id });
            if (deleteJournalResult.success === false) {
                return ResponseHelper.respond(400, false, deleteJournalResult, 'Journal deletion failed!', res);
            } else {
                return ResponseHelper.respond(200, true, deleteJournalResult, 'Journal deleted successfully.', res);
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    async deleteJrnlLibraryImage(req, res) {
        const { libraryIds } = req.body;
        try {
            const jrnlLibraryImgResult = await journalModel.deleteJrnlLibraryImage({ libraryIds });
            if (jrnlLibraryImgResult.success === false) {
                return ResponseHelper.respond(400, false, jrnlLibraryImgResult, 'Journal images deleted failed!', res);
            } else {
                return ResponseHelper.respond(200, true, jrnlLibraryImgResult, 'Journal images deleted successfully.', res);
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    // Get Journal User Wise
    async getJournalUserWise(req, res) {
        try {
            const userId = req.user.id;
            const journalId = req.params.id;

            const data = await journalModel.getJournalUserWise(userId, journalId);

            if (!data || data.length === 0) {
                return ResponseHelper.respond(404, false, { error: { message: 'Data not found!' } }, 'Data not found!', res);
            }

            const responseData = Array.isArray(data) ? data[0] : data;

            return ResponseHelper.respond(200, true, responseData, 'Successfully retrieved Journal data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async updateJournalUserWise(req, res) {
        const { id } = req.params;
        const userId = req.user.id;
        const { title, content, status, tags, files } = req.body;
        const validationErrors = {};

        if (!title || !title.trim()) {
            validationErrors.title = 'The title field is required.';
        }

        if (!content || !content.trim()) {
            validationErrors.content = 'The description field is required.';
        } else if (content.trim().length > 5000) {
            validationErrors.content = 'The description field must be maximum 5000 characters long.';
        }

        if (!status || !['0', '1', '2'].includes(status)) {
            validationErrors.status = 'Invalid value for status. It should be one of: 0, 1, 2.';
        }

        if (!title || !title.trim()) {
            validationErrors.title = 'The title field is required.';
        } else if (title.trim().length > 200) {
            validationErrors.title = 'The title field must be maximum 200 characters long.';
        }

        if (!status || !['0', '1', '2'].includes(status)) {
            validationErrors.status = 'Invalid value for status. It should be one of: 0, 1, 2.';
        }

        if (tags !== null && tags.length > 0) {
            const tagNames = tags.map(tag => tag.name);

            const isBelowLengthTag = tags.some(tag => tag.name.trim().length > 10);
            if (isBelowLengthTag) {
                validationErrors.tags = 'Tag name must be at least 10 characters long.';
            } else {
                const uniqueTagNames = new Set(tagNames); // Using Set to ensure uniqueness
                if (tagNames.length !== uniqueTagNames.size) {
                    validationErrors.tags = 'Tag name must be unique.';
                }
            }
        }

        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({ success: false, data: { error: validationErrors } });
        }

        try {
            const existingJournal = await journalModel.getJournalByName(title, userId, id);
            if (existingJournal.length > 0) {
                validationErrors.name = 'Journal title already exists.';
                return ResponseHelper.validateAndRespond(validationErrors, null, res);
            }

            const updateJournalData = {
                userId,
                id,
                title,
                content,
                status,
                tags,
                files
            };

            const updatedJournalData = await journalModel.updateJournalUserWise(updateJournalData);

            if (updatedJournalData.success === false) {
                return ResponseHelper.respond(400, false, updatedJournalData, 'Journal details update failed!', res);
            } else {
                return ResponseHelper.respond(200, true, updatedJournalData, 'Journal details updated successfully.', res);
            }

        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    async createExperience(req, res) {
        try {
            const userId = req.user.id;
            const journalId = req.params.id;
            const validationErrors = {};

            const data = await journalModel.getJournalUserWise(userId, journalId);

            if (!data || data.length === 0) {
                return ResponseHelper.respond(404, false, { error: { message: 'Insight not found!' } }, 'Insight not found!', res);
            }

            const existingExperience = await journalModel.getExperienceByNameAndUserId(data[0].journal?.title, userId);
            if (existingExperience.length > 0) {
                validationErrors.name = 'Insight title already exists.';
                return ResponseHelper.validateAndRespond(validationErrors, null, res);
            }

            const addJournal = {
                userId: userId,
                title: data[0].journal?.title,
                status: data[0].journal?.status,
                content: data[0].journal?.content,
                tags: data[0]?.tags,
                files: data[0]?.files,
                created_at: data[0].journal?.createdDate
            };

            const insertedJournalData = await journalModel.createExperience(addJournal);

            if (insertedJournalData.success === false) {
                return ResponseHelper.respond(400, false, insertedJournalData, 'Insight creation failed!', res);
            } else {
                return ResponseHelper.respond(200, true, insertedJournalData, 'Insight created successfully.', res);
            }

        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    // Get All Journals Calender View
    async getJournalsCalanderView(req, res) {
        try {
            const userId = req.user.id;
            const { sortBy, sortOrder, month } = req.body;
            const filterConditions = {
                userId,
                sortBy: sortBy || 'created_at',
                sortOrder: sortOrder || 'desc',
                month
            };

            const journals = await journalModel.getFilteredJrnlCalenderView(filterConditions);

            return ResponseHelper.respond(200, true, journals, 'Successfully retrieved all journals.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    // create Journal Calender Date Wise
    async createJournalCalenderView(req, res) {
        const { title, status, content, tags, files, type, created_at } = req.body;
        const validationErrors = {};

        if (!title || !title.trim()) {
            validationErrors.title = 'The title field is required.';
        } else if (title.trim().length > 200) {
            validationErrors.title = 'The title field must be maximum 200 characters long.';
        }

        if (!status || !['0', '1', '2'].includes(status)) {
            validationErrors.status = 'Invalid value for status. It should be one of: 0, 1, 2.';
        }

        if (!content || !content.trim()) {
            validationErrors.content = 'The description field is required.';
        } else if (content.trim().length > 5000) {
            validationErrors.content = 'The description field must be maximum 5000 characters long.';
        }

        if (tags !== null && tags.length > 0) {
            const tagNames = tags.map(tag => tag.name);

            const isBelowLengthTag = tags.some(tag => tag.name.trim().length > 10);
            if (isBelowLengthTag) {
                validationErrors.tags = 'Tag name must be at least 10 characters long.';
            } else {
                const uniqueTagNames = new Set(tagNames);
                if (tagNames.length !== uniqueTagNames.size) {
                    validationErrors.tags = 'Tag name must be unique.';
                }
            }
        }

        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({ success: false, data: { error: validationErrors } });
        }

        try {
            const userId = req.user.id;
            const existingJournal = await journalModel.getJournalByNameAndUserId(title, userId);
            if (existingJournal.length > 0) {
                validationErrors.name = 'Journal title already exists.';
                return ResponseHelper.validateAndRespond(validationErrors, null, res);
            }

            if (type == '1') {
                const existingExperience = await journalModel.getExperienceByNameAndUserId(title, userId);
                if (existingExperience.length > 0) {
                    validationErrors.name = 'Insight title already exists.';
                    return ResponseHelper.validateAndRespond(validationErrors, null, res);
                }
            }

            const addJournal = {
                userId: userId,
                title: title,
                status: status,
                content: content,
                tags: tags,
                files: files,
                created_at: created_at,
                type: type
            };

            const insertedJournalData = await journalModel.createJournalCalenderView(addJournal);

            if (insertedJournalData.success === false) {
                const failureMessage = type == '1'
                    ? 'Journal or Insight creation failed!'
                    : 'Journal creation failed!';
                return ResponseHelper.respond(400, false, insertedJournalData, failureMessage, res);
            } else {
                const successMessage = type == "1"
                    ? 'Journal and Insight both are created successfully.'
                    : 'Journal created successfully.';
                return ResponseHelper.respond(200, true, insertedJournalData, successMessage, res);
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }
    async getdatafromglobalsearch(req, res) {
        const data = [];
        try {
            const userId = req.user.id;
            const { searchData } = req.query;
            if (searchData) {
                const journaldata = await journalModel.getGlobalSearchDatajournal({ searchData, userId });

                return ResponseHelper.respond(200, true, { journaldata }, 'Successfully retrieved data.', res);
            }
            return ResponseHelper.respond(200, true, { data }, 'Successfully retrieved data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }
    async getdatafromglobalsearchByid(req, res) {
        const data = [];
        try {
            const userId = req.user.id;
            const { journalid } = req.query;
            if (journalid) {
                const journaldata = await journalModel.getGlobalSearchDatajournalByid(journalid, userId);

                return ResponseHelper.respond(200, true, { journaldata }, 'Successfully retrieved data.', res);
            }
            return ResponseHelper.respond(200, true, { data }, 'Successfully retrieved data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }
}

module.exports = new JournalController();
