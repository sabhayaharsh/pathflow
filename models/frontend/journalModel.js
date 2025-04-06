const db = require('../../config/database');
const moment = require('moment');


class JournalPillarModel {

    async createJournal(data) {
        const { userId, title, content, tags, files, status, type, created_at } = data;
        try {
            const journalQuery = 'INSERT INTO journals (user_id, title, content, status, created_at) VALUES (?, ?, ?, ?, ?)';
            const lastInsertedId = await new Promise((resolve, reject) => {
                db.query(journalQuery, [userId, title, content, status, created_at], function (err, result) {
                    if (err) { reject(err) }
                    else { resolve(result.insertId) }
                });
            });

            if (type == "1") {
                const lifeBooksQuery = 'INSERT INTO life_books (user_id, title, type, status, publish_date) VALUES (?, ?, ?, ?, ?)';
                const lastInsertedId = await new Promise((resolve, reject) => {
                    db.query(lifeBooksQuery, [userId, title, "1", status, created_at], function (err, result) {
                        if (err) { reject(err) }
                        else { resolve(result.insertId) }
                    });
                });

                const insightQuery = 'INSERT INTO knowledge_experience_insights (lb_id, name, created_at) VALUES (?, ?, ?)';
                await new Promise((resolve, reject) => {
                    db.query(insightQuery, [lastInsertedId, content, created_at], (insightErr, insightResult) => {
                        if (insightErr) { reject(insightErr) }
                        else { resolve(insightResult) }
                    });
                });

                tags.forEach(async (tag) => {
                    const tagsQuery = 'INSERT INTO life_book_has_tags (user_id, lb_id, name, created_at) VALUES (?, ?, ?, ?)';
                    db.query(tagsQuery, [userId, lastInsertedId, tag.name, created_at], (tegErr, tagResult) => {
                        if (tegErr) { console.error('Error inserting into tags table', tegErr) }
                    });
                });

                if (Array.isArray(files)) {
                    files.forEach(file => {
                        const fileQuery = 'INSERT INTO life_book_has_files (lb_id, original_filename, name, url, type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)';
                        db.query(fileQuery, [lastInsertedId, file.original_filename, file.name, file.url, file.mimetype, file.size, created_at], (fileErr, fileResult) => {
                            if (fileErr) { console.error('Error inserting into file table', fileErr) }
                        });
                    });
                }
            }

            tags.forEach(async (tag) => {
                const tagsQuery = 'INSERT INTO journal_has_tags (user_id, jrl_id,  name, created_at) VALUES (?, ?, ?, ?)';
                db.query(tagsQuery, [userId, lastInsertedId, tag.name, created_at], (tagErr, tagResult) => {
                    if (tagErr) { console.error('Error inserting into tags table', tagErr) }
                });
            });

            if (Array.isArray(files)) {
                files.forEach(file => {
                    if (file.type == '0') {
                        const imageLibraryQuery = 'INSERT INTO journal_image_libraries (user_id, original_filename, name, url, type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)';
                        db.query(imageLibraryQuery, [userId, file.original_filename, file.name, file.url, file.mimetype, file.size, created_at], (imageLibraryErr, imageLibraryResult) => {
                            if (imageLibraryErr) {
                                console.error('Error inserting into journal_image_libraries table', imageLibraryErr);
                            } else {
                                const journalImageLibraryId = imageLibraryResult.insertId;
                                const fileQuery = 'INSERT INTO journal_has_files (jrl_id, jrl_img_lbry_id, original_filename, name, url, type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
                                db.query(fileQuery, [lastInsertedId, journalImageLibraryId, file.original_filename, file.name, file.url, file.mimetype, file.size, created_at], (fileErr, fileResult) => {
                                    if (fileErr) { console.error('Error inserting into journal_has_files table', fileErr) }
                                });
                            }
                        });
                    } else {
                        const fileQuery = 'INSERT INTO journal_has_files (jrl_id,jrl_img_lbry_id, original_filename, name, url, type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
                        db.query(fileQuery, [lastInsertedId, file.id, file.original_filename, file.name, file.url, file.mimetype, file.size, created_at], (fileErr, fileResult) => {
                            if (fileErr) { console.error('Error inserting into file table', fileErr) }
                        });
                    }
                });
            }

            return {
                lastInsertedId,
                title,
                status,
                content,
                tags,
                created_at,
                files: files.map(file => ({
                    original_filename: file.original_filename,
                    name: file.filename,
                    url: file.url,
                    type: file.mimetype,
                    size: file.size,
                }))
            };

        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async getExperienceByNameAndUserId(name, userId) {
        try {
            const query = 'SELECT * FROM `life_books` WHERE `title` = ? AND `user_id` = ? AND type = ?';
            const groups = await new Promise((resolve, reject) => {
                db.query(query, [name, userId, '1'], (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
            return groups;
        } catch (error) {
            console.error(error);
            throw error; // Rethrow the error to be handled by the caller
        }
    }

    async getJournalByNameAndUserId(name, userId) {
        try {
            const query = 'SELECT * FROM `journals` WHERE `title` = ? AND `user_id` = ? AND `status` = ?';
            const groups = await new Promise((resolve, reject) => {
                db.query(query, [name, userId, '1'], (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
            return groups;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async insertJournalImageLibrary({ userId, original_filename, name, url, type, size }) {
        try {
            const journalQuery = 'INSERT INTO journal_image_libraries (user_id, original_filename, name, url, type, size, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
            return await new Promise((resolve, reject) => {
                db.query(journalQuery, [userId, original_filename, name, url, type, size, '1'], function (err, result) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result.insertId);
                    }
                });
            });
        } catch (error) {
            console.error('Error inserting into journal_image_libraries:', error);
            throw error;
        }
    }

    async getFilteredJournalImages({
        userId,
        status,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        offset,
        perPage,
    }) {
        let query = `
            SELECT id, original_filename, name, url, type AS mimetype, size, status, created_at
            FROM journal_image_libraries
            WHERE user_id = ?
        `;

        const queryParams = [userId];
        if (status) {
            query += ` AND status = ? `;
            queryParams.push(status);
        }

        const validSortColumns = ['id', 'original_filename', 'name', 'url', 'type', 'size', 'status', 'created_at'];
        if (!validSortColumns.includes(sortBy)) {
            sortBy = 'created_at';
        }

        if (sortOrder.toUpperCase() !== 'ASC' && sortOrder.toUpperCase() !== 'DESC') {
            sortOrder = 'DESC';
        }

        query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ? `;
        queryParams.push(perPage, offset);

        return new Promise((resolve, reject) => {
            db.query(query, queryParams, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    }


    async getTotalJournalImages({
        userId,
        status,
    }) {
        let query = `
            SELECT COUNT(*) AS totalJournalImages
            FROM journal_image_libraries
            WHERE user_id = ? 
        `;

        const queryParams = [userId];
        if (status) {
            query += ` AND status = ? `;
            queryParams.push(status);
        }

        return new Promise((resolve, reject) => {
            db.query(query, queryParams, (err, results) => {
                if (err) return reject(err);
                resolve(results[0].totalJournalImages || 0);
            });
        });
    }

    async getFilteredJournals({
        userId,
        fromDate,
        toDate,
        status,
        sortBy,
        sortOrder,
        journalTitle,
        search,
        offset,
        perPage,
    }) {
        let query = `
            SELECT id, title AS journalTitle, content, status, created_at
            FROM journals
            WHERE user_id = ?
        `;

        const queryParams = [userId];

        // Adding filters
        if (status) {
            query += ` AND status = ? `;
            queryParams.push(status);
        }
        if (fromDate) {
            query += ` AND DATE(created_at) >= ? `;
            queryParams.push(fromDate);
        }
        if (toDate) {
            query += ` AND DATE(created_at) <= ? `;
            queryParams.push(toDate);
        }
        if (journalTitle) {
            query += ` AND title LIKE ? `;
            queryParams.push(`%${journalTitle}%`);
        }
        // if (search) {     // old process to search 
        //     query += ` AND (title LIKE ? OR content LIKE ?) `;
        //     queryParams.push(`%${search}%`, `%${search}%`);
        // }
        if (search) {
            query += ` AND id = ${search} `;    // here search based on id not title 
            //queryParams.push(`%${search}%`, `%${search}%`);
        }

        // Validate and sanitize sorting
        const validColumns = ['created_at', 'title', 'status']; // Add all valid columns here
        if (!validColumns.includes(sortBy)) {
            sortBy = 'created_at'; // Default column
        }

        const sortOrderValue = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'; // Default to DESC

        // Adding sorting
        query += ` ORDER BY ${sortBy} ${sortOrderValue} `;

        // Adding pagination
        query += ` LIMIT ? OFFSET ? `;
        queryParams.push(perPage, offset);

        return new Promise((resolve, reject) => {
            db.query(query, queryParams, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    }


    async getTotalJournals({
        userId,
        fromDate,
        toDate,
        status,
        journalTitle,
        search,
    }) {
        let query = `
            SELECT COUNT(*) AS totalJournals
            FROM journals
            WHERE user_id = ?
        `;

        const queryParams = [userId];

        if (status) {
            query += ` AND status = ? `;
            queryParams.push(status);
        }
        if (fromDate) {
            query += ` AND DATE(created_at) >= ? `;
            queryParams.push(fromDate);
        }
        if (toDate) {
            query += ` AND DATE(created_at) <= ? `;
            queryParams.push(toDate);
        }
        if (journalTitle) {
            query += ` AND title LIKE ? `;
            queryParams.push(`%${journalTitle}%`);
        }
        if (search) {
            query += ` AND (title LIKE ? OR content LIKE ?) `;
            queryParams.push(`%${search}%`, `%${search}%`);
        }

        return new Promise((resolve, reject) => {
            db.query(query, queryParams, (err, results) => {
                if (err) return reject(err);
                resolve(results[0].totalJournals || 0);
            });
        });
    }

    async deleteJournal(data) {
        const { id } = data;

        try {
            // Step 1: Update journal status to 'deleted' (status = 2)
            const updateJournalQuery = 'UPDATE journals SET status = ? WHERE id = ?';
            const updateJournalResult = await new Promise((resolve, reject) => {
                db.query(updateJournalQuery, ['2', id], (err, result) => {
                    if (err) {
                        console.error('Error updating journal status:', err);
                        return reject(err);
                    }
                    if (result.affectedRows > 0) {
                        resolve({ success: true, id });
                    } else {
                        resolve({ success: false, id, error: { message: 'Journal not found or already deleted.' } });
                    }
                });
            });

            if (!updateJournalResult.success) {
                return updateJournalResult;
            }

            // Step 2: Delete associated tags
            const deleteTagsQuery = 'DELETE FROM journal_has_tags WHERE jrl_id = ?';
            const deleteTagsResult = await new Promise((resolve, reject) => {
                db.query(deleteTagsQuery, [id], (err, result) => {
                    if (err) return reject(err);
                    resolve({ success: true, id, message: 'Tags deleted successfully.' });
                });
            });

            // Step 3: Get files associated with the journal
            const getFilesQuery = 'SELECT jrl_img_lbry_id FROM journal_has_files WHERE jrl_id = ?';
            const journalFiles = await new Promise((resolve, reject) => {
                db.query(getFilesQuery, [id], (err, result) => {
                    if (err) {
                        console.error('Error fetching journal files:', err);
                        return reject(err);
                    }
                    resolve(result);
                });
            });

            // Step 4: Delete files from journal_has_files
            const deleteFilesQuery = 'DELETE FROM journal_has_files WHERE jrl_id = ?';
            const deleteFilesResult = await new Promise((resolve, reject) => {
                db.query(deleteFilesQuery, [id], (err, result) => {
                    if (err) {
                        console.error('Error deleting journal files:', err);
                        return reject(err);
                    }
                    resolve({ success: true, id, message: 'Files deleted successfully.' });
                });
            });

            // Step 5: Check and delete images from journal_image_libraries
            for (const file of journalFiles) {
                const imageId = file.jrl_img_lbry_id;

                // Check if the image is associated with any other journal
                const checkImageQuery = 'SELECT COUNT(*) as count FROM journal_has_files WHERE jrl_img_lbry_id = ?';
                const isImageUsedElsewhere = await new Promise((resolve, reject) => {
                    db.query(checkImageQuery, [imageId], (err, result) => {
                        if (err) {
                            console.error('Error checking image usage:', err);
                            return reject(err);
                        }
                        resolve(result[0].count > 0);
                    });
                });

                // If the image is not used elsewhere, delete it
                if (!isImageUsedElsewhere) {
                    const deleteImageQuery = 'DELETE FROM journal_image_libraries WHERE id = ?';
                    await new Promise((resolve, reject) => {
                        db.query(deleteImageQuery, [imageId], (err, result) => {
                            if (err) {
                                console.error('Error deleting image:', err);
                                return reject(err);
                            }
                            resolve({ success: true, id: imageId, message: 'Image deleted successfully.' });
                        });
                    });
                }
            }

            // Return final result
            return {
                success: true,
                id,
                message: 'Journal deleted successfully.',
            };
        } catch (error) {
            console.error('Error in deleteJournal:', error);
            throw error;
        }
    }



    async deleteJrnlLibraryImage(data) {
        const { libraryIds } = data;
        try {
            const referencedIdsQuery = `
            SELECT DISTINCT jrl_img_lbry_id FROM journal_has_files 
            WHERE jrl_img_lbry_id IN (?)`;

            const deleteQuery = `
            DELETE FROM journal_image_libraries 
            WHERE id IN (?) AND id NOT IN 
            (SELECT DISTINCT jrl_img_lbry_id FROM journal_has_files)`;

            return new Promise((resolve, reject) => {
                db.query(referencedIdsQuery, [libraryIds], (refErr, refResult) => {
                    if (refErr) { return reject(refErr) }
                    const referencedIds = refResult.map(row => row.jrl_img_lbry_id);
                    const idsToDelete = libraryIds.filter(id => !referencedIds.includes(id));

                    if (idsToDelete.length === 0) {
                        return resolve({ success: true, message: 'All selected images are currently use in other journals and cannot be deleted.', });
                    }

                    db.query(deleteQuery, [idsToDelete], (delErr, delResult) => {
                        if (delErr) { return reject(delErr) }
                        resolve({ success: true, deletedIds: idsToDelete, message: "Journal images deleted successfully." });
                    });
                });
            });
        } catch (error) {
            console.error('Error deleting journal library images', error);
            throw error;
        }
    }

    async getJournalUserWise(userId, journalId) {
        const setGroupConcatMaxLen = `SET SESSION group_concat_max_len = 1000000;`;
        const separator = '||';  // Unique separator unlikely to appear in data
        const query = `
            SELECT
                jrnl.id AS journalId,
                jrnl.status AS status,
                jrnl.created_at AS createdDate,
                jrnl.title AS journalTitle,
                jrnl.content AS description,
                GROUP_CONCAT(DISTINCT jrnlht.name ORDER BY jrnlht.id ASC SEPARATOR '${separator}') AS tags,
                GROUP_CONCAT(DISTINCT jrnlhf.id ORDER BY CASE WHEN jrnlhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '${separator}') AS fileIds,
                GROUP_CONCAT(DISTINCT jrnlhf.name ORDER BY CASE WHEN jrnlhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '${separator}') AS fileNames,
                GROUP_CONCAT(DISTINCT jrnlhf.url ORDER BY CASE WHEN jrnlhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '${separator}') AS fileUrls,
                GROUP_CONCAT(DISTINCT jrnlhf.type ORDER BY CASE WHEN jrnlhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '${separator}') AS fileTypes,
                GROUP_CONCAT(DISTINCT jrnlhf.size ORDER BY CASE WHEN jrnlhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '${separator}') AS fileSizes,
                GROUP_CONCAT(jrnlhf.original_filename ORDER BY CASE WHEN jrnlhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '${separator}') AS fileOriginalName
            FROM journals jrnl
            LEFT JOIN journal_has_tags jrnlht ON jrnl.id = jrnlht.jrl_id
            LEFT JOIN journal_has_files jrnlhf ON jrnl.id = jrnlhf.jrl_id
            WHERE jrnl.user_id = ? AND jrnl.id = ?
            GROUP BY jrnl.id
            LIMIT 1
        `;
        return new Promise((resolve, reject) => {
            db.query(setGroupConcatMaxLen, (err) => {
                if (err) return reject(err);

                db.query(query, [userId, journalId], (err, results) => {
                    if (err) return reject(err);
                    if (results.length === 0) {
                        resolve([]);
                    } else {
                        const row = results[0];

                        const journal = {
                            id: row.journalId,
                            title: row.journalTitle,
                            content: row.description,
                            status: row.status,
                            createdDate: row.createdDate
                        };
                        const tags = row.tags ? row.tags.split(separator) : [];
                        const fileIds = row.fileIds ? row.fileIds.split(separator) : [];
                        const fileNames = row.fileNames ? row.fileNames.split(separator) : [];
                        const fileUrls = row.fileUrls ? row.fileUrls.split(separator) : [];
                        const fileTypes = row.fileTypes ? row.fileTypes.split(separator) : [];
                        const fileSizes = row.fileSizes ? row.fileSizes.split(separator) : [];
                        const original_filenames = row.fileOriginalName ? row.fileOriginalName.split(separator) : [];

                        const correctedFiles = fileNames.map((name, index) => {
                            const type = fileTypes[index] || '';
                            const extension = name.split('.').pop().toLowerCase();
                            const extensionToMimetype = {
                                'jpg': 'image/jpeg',
                                'jpeg': 'image/jpeg',
                                'png': 'image/png',
                            };
                            const correctedType = extensionToMimetype[extension] || type;
                            return {
                                id: fileIds[index],
                                original_filename: original_filenames[index],
                                name,
                                url: fileUrls[index],
                                mimetype: correctedType,
                                size: fileSizes[index]
                            };
                        });

                        const experienceWithTaskProgress = {
                            journal,
                            tags,
                            files: correctedFiles
                        };
                        resolve([experienceWithTaskProgress]);
                    }
                });
            });
        });
    }

    async getJournalByName(name, userId, journalId = null) {
        try {
            let query = 'SELECT * FROM `journals` WHERE `title` = ? AND `user_id` = ? AND status = ?';
            const queryParams = [name, userId, '1'];

            if (journalId) {
                query += ' AND `id` != ?';
                queryParams.push(journalId);
            }

            const journals = await new Promise((resolve, reject) => {
                db.query(query, queryParams, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
            return journals;
        } catch (error) {
            console.error(error);
            throw error; // Rethrow the error to be handled by the caller
        }
    }

    async updateJournalUserWise(data) {
        const { userId, id, title, content, status, tags, files } = data;

        try {
            const checkIdQuery = 'SELECT id FROM journals WHERE id = ? AND user_id = ?';
            const idExists = await new Promise((resolve, reject) => {
                db.query(checkIdQuery, [id, userId], (err, result) => {
                    if (err) { reject(err) }
                    else { resolve(result && result.length > 0) }
                });
            });

            if (!idExists) {
                return {
                    success: false, message: 'Journal not found with the specified id and user_id combination.',
                };
            }

            const lifeBooksQuery = 'UPDATE journals SET title = ?, content = ?, status = ? WHERE id = ? AND user_id = ?';
            db.query(lifeBooksQuery, [title, content, status, id, userId], function (err, result) {
                if (err) { reject(err) }
            });

            const existingTagsQuery = 'SELECT id FROM journal_has_tags WHERE jrl_id = ?';
            const existingTags = await new Promise((resolve, reject) => {
                db.query(existingTagsQuery, [id], (err, result) => {
                    if (err) { reject(err) }
                    else { resolve(result) }
                });
            });

            const existingTagIds = existingTags.map(tag => tag.id);
            const updateTagPromises = tags.map(async (newTag) => {
                const updateTagQuery = 'UPDATE journal_has_tags SET name = ?, user_id = ? WHERE jrl_id = ? AND id = ?';
                db.query(updateTagQuery, [newTag.name, userId, id, newTag.id], (updateTagErr, updateTagResult) => {
                    if (updateTagErr) {
                        console.error('Error updating tag', updateTagErr);
                    }
                });
            });

            await Promise.all(updateTagPromises);

            const insertTagPromises = tags.filter(newTag => !newTag.id).map(async (newTag) => {
                const insertTagQuery = 'INSERT INTO journal_has_tags (jrl_id, name, user_id) VALUES (?, ?, ?)';
                db.query(insertTagQuery, [id, newTag.name, userId], (insertTagErr, insertTagResult) => {
                    if (insertTagErr) {
                        console.error('Error inserting new tag', insertTagErr);
                    }
                });
            });

            await Promise.all(insertTagPromises);

            const deleteTagPromises = existingTagIds
                .filter(existingTagId => !tags.some(updatedTag => updatedTag.id === existingTagId))
                .map(async (tagIdToDelete) => {
                    const deleteTagQuery = 'DELETE FROM journal_has_tags WHERE jrl_id = ? AND id = ?';
                    db.query(deleteTagQuery, [id, tagIdToDelete], (deleteTagErr, deleteTagResult) => {
                        if (deleteTagErr) {
                            console.error('Error deleting tag', deleteTagErr);
                        }
                    });
                });

            await Promise.all(deleteTagPromises);

            const currentFilesQuery = 'SELECT id, original_filename, name, url, type, size FROM journal_has_files WHERE jrl_id = ?';
            const currentFiles = await new Promise((resolve, reject) => {
                db.query(currentFilesQuery, [id], (err, result) => {
                    if (err) {
                        console.error('Error retrieving current files', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });

            const filesToDelete = currentFiles.filter(file => !files.some(updatedFile => updatedFile.filename === file.name));
            const filesToInsert = files.filter(updatedFile => !currentFiles.some(currentFile => currentFile.name === updatedFile.filename));

            const deleteFilePromises = filesToDelete.map(fileToDelete => {
                const deleteFileQuery = 'DELETE FROM journal_has_files WHERE jrl_id = ? AND id = ?';
                const deleteFileValues = [id, fileToDelete.id];

                return new Promise((resolve, reject) => {
                    db.query(deleteFileQuery, deleteFileValues, (deleteFileErr, deleteFileResult) => {
                        if (deleteFileErr) {
                            console.error('Error deleting file from database', deleteFileErr);
                            reject(deleteFileErr);
                        } else {
                            resolve();
                        }
                    });
                });
            });

            const insertFilePromises = filesToInsert.map(file => {
                if (file.type == '0') {
                    const imageLibraryQuery = 'INSERT INTO journal_image_libraries (user_id, original_filename, name, url, type, size) VALUES (?, ?, ?, ?, ?, ?)';
                    db.query(imageLibraryQuery, [userId, file.original_filename, file.name, file.url, file.mimetype, file.size], async (imageLibraryErr, imageLibraryResult) => {
                        if (imageLibraryErr) {
                            console.error('Error inserting into journal_image_libraries table', imageLibraryErr);
                        } else {
                            const journalImageLibraryId = imageLibraryResult.insertId;
                            const fileQuery = 'INSERT INTO journal_has_files (jrl_id, jrl_img_lbry_id, original_filename, name, url, type, size) VALUES (?, ?, ?, ?, ?, ?, ?)';
                            db.query(fileQuery, [id, journalImageLibraryId, file.original_filename, file.name, file.url, file.mimetype, file.size], (fileErr, fileResult) => {
                                if (fileErr) { console.error('Error inserting into journal_has_files table', fileErr) }
                            });
                        }
                    });
                } else {
                    const fileQuery = 'INSERT INTO journal_has_files (jrl_id,jrl_img_lbry_id, original_filename, name, url, type, size) VALUES (?, ?, ?, ?, ?, ?, ?)';
                    db.query(fileQuery, [id, file?.id, file.original_filename, file.name, file.url, file.mimetype, file.size], (fileErr, fileResult) => {
                        if (fileErr) { console.error('Error inserting into file table', fileErr) }
                    });
                }

            });

            await Promise.all([...deleteFilePromises, ...insertFilePromises]);

            return {
                id,
                title,
                content,
                status,
                tags,
                files: files.map(file => ({
                    original_filename: file.original_filename,
                    name: file.filename,
                    url: file.url,
                    type: file.mimetype,
                    size: file.size,
                }))
            };
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async createExperience(data) {
        const { userId, title, content, tags, files, status, created_at } = data;
        try {

            const lifeBooksQuery = 'INSERT INTO life_books (user_id, title, type, status, created_at, publish_date) VALUES (?, ?, ?, ?, ?, ?)';
            const lastInsertedId = await new Promise((resolve, reject) => {
                db.query(lifeBooksQuery, [userId, title, "1", status, created_at, created_at], function (err, result) {
                    if (err) { reject(err) }
                    else { resolve(result.insertId) }
                });
            });

            const insightQuery = 'INSERT INTO knowledge_experience_insights (lb_id, name, created_at) VALUES (?, ?, ?)';
            await new Promise((resolve, reject) => {
                db.query(insightQuery, [lastInsertedId, content, created_at], (insightErr, insightResult) => {
                    if (insightErr) { reject(insightErr) }
                    else { resolve(insightResult) }
                });
            });

            tags.forEach(async (tag) => {
                const tagName = typeof tag === 'string' ? tag : tag.name; // Handle both string and object cases
                if (tagName) {
                    const tagsQuery = 'INSERT INTO life_book_has_tags (user_id, lb_id, name, created_at) VALUES (?, ?, ?, ?)';
                    db.query(tagsQuery, [userId, lastInsertedId, tagName, created_at], (tagErr, tagResult) => {
                        if (tagErr) {
                            console.error('Error inserting into tags table', tagErr);
                        }
                    });
                } else {
                    console.error('Invalid tag data: name is null or undefined');
                }
            });

            if (Array.isArray(files)) {
                files.forEach(file => {
                    const fileQuery = 'INSERT INTO life_book_has_files (lb_id, original_filename, name, url, type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)';
                    db.query(fileQuery, [lastInsertedId, file.original_filename, file.name, file.url, file.mimetype, file.size, created_at], (fileErr, fileResult) => {
                        if (fileErr) { console.error('Error inserting into file table', fileErr) }
                    });
                });
            }

            return {
                lastInsertedId,
                title,
                status,
                content,
                tags,
                files: files.map(file => ({
                    original_filename: file.original_filename,
                    name: file.filename,
                    url: file.url,
                    type: file.mimetype,
                    size: file.size,
                })),
                created_at
            };

        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async getFilteredJrnlCalenderView({ userId, sortBy, sortOrder, month }) {
        const monthRanges = Array.isArray(month)
            ? month.map((m) => ({
                start: moment(m, 'MMMM YYYY').startOf('month').utc().format('YYYY-MM-DD HH:mm:ss'),
                end: moment(m, 'MMMM YYYY').endOf('month').utc().format('YYYY-MM-DD HH:mm:ss'),
            }))
            : [{
                start: moment(month, 'MMMM YYYY').startOf('month').utc().format('YYYY-MM-DD HH:mm:ss'),
                end: moment(month, 'MMMM YYYY').endOf('month').utc().format('YYYY-MM-DD HH:mm:ss'),
            }];


        const monthConditions = monthRanges.map(() => `(created_at BETWEEN ? AND ?)`).join(' OR ');
        const baseQuery = `
            SELECT 
                id, 
                title, 
                created_at 
            FROM journals 
            WHERE user_id = ? AND status = ?
              AND (${monthConditions})
              ${sortBy ? `ORDER BY ${sortBy} ${sortOrder}` : ''}
        `;

        const queryParams = [userId, '1'];
        monthRanges.forEach((range) => {
            queryParams.push(range.start, range.end);
        });

        return new Promise((resolve, reject) => {
            db.query(baseQuery, queryParams, (err, results) => {
                if (err) return reject(err);

                const journals = results.map((row) => ({
                    id: row.id,
                    title: row.title,
                    start: moment(row.created_at).format('D MMMM YYYY h:mm a'),
                    end: moment(row.created_at).format('D MMMM YYYY h:mm a'),
                }));
                resolve(journals);
            });
        });
    }

    async createJournalCalenderView(data) {
        const { userId, title, content, tags, files, status, type, created_at } = data;
        try {
            const journalQuery = 'INSERT INTO journals (user_id, title, content, status, created_at) VALUES (?, ?, ?, ?, ?)';
            const lastInsertedId = await new Promise((resolve, reject) => {
                db.query(journalQuery, [userId, title, content, status, created_at], function (err, result) {
                    if (err) { reject(err) }
                    else { resolve(result.insertId) }
                });
            });

            if (type == "1") {
                const lifeBooksQuery = 'INSERT INTO life_books (user_id, title, type, status, publish_date) VALUES (?, ?, ?, ?, ?)';
                const lastInsertedId = await new Promise((resolve, reject) => {
                    db.query(lifeBooksQuery, [userId, title, "1", status, created_at], function (err, result) {
                        if (err) { reject(err) }
                        else { resolve(result.insertId) }
                    });
                });

                const insightQuery = 'INSERT INTO knowledge_experience_insights (lb_id, name, created_at) VALUES (?, ?, ?)';
                await new Promise((resolve, reject) => {
                    db.query(insightQuery, [lastInsertedId, content, created_at], (insightErr, insightResult) => {
                        if (insightErr) { reject(insightErr) }
                        else { resolve(insightResult) }
                    });
                });

                tags.forEach(async (tag) => {
                    const tagsQuery = 'INSERT INTO life_book_has_tags (user_id, lb_id,  name, created_at) VALUES (?, ?, ?, ?)';
                    db.query(tagsQuery, [userId, lastInsertedId, tag.name, created_at], (tegErr, tagResult) => {
                        if (tegErr) { console.error('Error inserting into tags table', tegErr) }
                    });
                });

                if (Array.isArray(files)) {
                    files.forEach(file => {
                        const fileQuery = 'INSERT INTO life_book_has_files (lb_id, original_filename, name, url, type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)';
                        db.query(fileQuery, [lastInsertedId, file.original_filename, file.name, file.url, file.mimetype, file.size, created_at], (fileErr, fileResult) => {
                            if (fileErr) { console.error('Error inserting into file table', fileErr) }
                        });
                    });
                }
            }

            tags.forEach(async (tag) => {
                const tagsQuery = 'INSERT INTO journal_has_tags (user_id, jrl_id,  name, created_at) VALUES (?, ?, ?, ?)';
                db.query(tagsQuery, [userId, lastInsertedId, tag.name, created_at], (tagErr, tagResult) => {
                    if (tagErr) { console.error('Error inserting into tags table', tagErr) }
                });
            });

            if (Array.isArray(files)) {
                files.forEach(file => {
                    if (file.type == '0') {
                        const imageLibraryQuery = 'INSERT INTO journal_image_libraries (user_id, original_filename, name, url, type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)';
                        db.query(imageLibraryQuery, [userId, file.original_filename, file.name, file.url, file.mimetype, file.size, created_at], (imageLibraryErr, imageLibraryResult) => {
                            if (imageLibraryErr) {
                                console.error('Error inserting into journal_image_libraries table', imageLibraryErr);
                            } else {
                                const journalImageLibraryId = imageLibraryResult.insertId;
                                const fileQuery = 'INSERT INTO journal_has_files (jrl_id, jrl_img_lbry_id, original_filename, name, url, type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
                                db.query(fileQuery, [lastInsertedId, journalImageLibraryId, file.original_filename, file.name, file.url, file.mimetype, file.size, created_at], (fileErr, fileResult) => {
                                    if (fileErr) { console.error('Error inserting into journal_has_files table', fileErr) }
                                });
                            }
                        });
                    } else {
                        const fileQuery = 'INSERT INTO journal_has_files (jrl_id,jrl_img_lbry_id, original_filename, name, url, type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
                        db.query(fileQuery, [lastInsertedId, file.id, file.original_filename, file.name, file.url, file.mimetype, file.size, created_at], (fileErr, fileResult) => {
                            if (fileErr) { console.error('Error inserting into file table', fileErr) }
                        });
                    }
                });
            }

            return {
                lastInsertedId,
                title,
                status,
                content,
                tags,
                files: files.map(file => ({
                    original_filename: file.original_filename,
                    name: file.filename,
                    url: file.url,
                    type: file.mimetype,
                    size: file.size,
                })),
                created_at
            };

        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async getGlobalSearchDatajournal({ searchData, userId }) {
        return new Promise(async (resolve, reject) => {
            const query = `
            SELECT jun.id, jun.title, jun.content
            FROM journals jun
            WHERE (jun.title LIKE ? OR jun.content LIKE ?) AND user_id = ? AND jun.status != '2'
        `;

            // comment on 22-08-2024 for create bug when search data using blank space.
            //const searchValue = '%' + searchData.replace(/%/g, '\\%') + '%';
            const Searchvalues = '%' + searchData + '%';

            try {
                const results = await new Promise((resolve, reject) => {
                    db.query(query, [Searchvalues, Searchvalues, userId], (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                });
                console.log('query', query)
                console.log('Searchvalues', Searchvalues)
                console.log('userId', userId)
                const journaldata = results.map(element => ({
                    id: element.id,
                    title: element.title,
                    content: element.content
                }));

                resolve(journaldata);

            } catch (error) {
                console.error("Error fetching global search data:", error);
                reject(error);
            }
        });
    }

    async getGlobalSearchDatajournalByid(journalid, userId) {
        return new Promise(async (resolve, reject) => {
            const query = `SELECT jun.id,jun.title,jun.content FROM journals jun
                           WHERE jun.id = ? AND user_id = ? `;

            try {
                const results = await new Promise((resolve, reject) => {
                    db.query(query, [journalid, userId], (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                });

                const journaldata = results.map(element => ({
                    id: element.id,
                    title: element.title,
                    content: element.content
                }));

                resolve(journaldata);

            } catch (error) {
                console.error("Error fetching global search data:", error);
                reject(error);
            }
        });
    }
}

module.exports = new JournalPillarModel();
