const db = require('../../config/database');
class DecisionPillarModel {

    async GetOpportunityIdWise(opportunityId) {
        const query = `
        SELECT
            lb.id AS opportunityId,
            lb.title AS opportunityTitle,
            lb.is_completed_assessment as is_completed_assessment,
            lea.id AS assessmentId,
            lea.grade,
            lea.did_progress_towards_life_purpose,
            lea.did_help_another_person,
            lea.do_differently,
            lea.comments,
            GROUP_CONCAT(DISTINCT CONCAT(lbt.name, ':', lbt.status) ORDER BY lbt.id ASC) AS tasks,
            GROUP_CONCAT(DISTINCT lbhf.name ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END) AS fileNames,
            GROUP_CONCAT(DISTINCT lbhf.url ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END) AS fileUrls,
            GROUP_CONCAT(DISTINCT lbhf.type ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END) AS fileTypes,
            GROUP_CONCAT(DISTINCT lbhf.size ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END) AS fileSizes,
            GROUP_CONCAT(DISTINCT lbhf.original_filename ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END) AS fileOriginalName,
            GROUP_CONCAT(DISTINCT CONCAT(lbg.name, ':', lbg.description) SEPARATOR ';') AS goals,
            GROUP_CONCAT(DISTINCT CONCAT(lsc.name, ':', lsc.importance, ':', lsc.priority) SEPARATOR ';') AS successCriteria,
            GROUP_CONCAT(DISTINCT lo.name) AS options,
            GROUP_CONCAT(DISTINCT CONCAT(lc.name, ':', lc.reason) SEPARATOR ';') AS decisions,
            GROUP_CONCAT(DISTINCT lbtg.name) AS tags
        FROM life_books lb
        LEFT JOIN life_book_has_assessment lea ON lb.id = lea.lb_id
        LEFT JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
        LEFT JOIN life_book_has_files lbhf ON lb.id = lbhf.lb_id
        LEFT JOIN dicision_opportunities_goals lbg ON lb.id = lbg.lb_id
        LEFT JOIN dicision_opportunities_success_criteria lsc ON lb.id = lsc.lb_id
        LEFT JOIN dicision_opportunities_options lo ON lb.id = lo.lb_id
        LEFT JOIN dicision_opportunities_decisions lc ON lb.id = lc.lb_id
        LEFT JOIN life_book_has_tags lbtg ON lb.id = lbtg.lb_id
        WHERE lb.id = ?
        GROUP BY lb.id, lea.id
        LIMIT 1
    `;

        return new Promise((resolve, reject) => {
            db.query(query, [opportunityId], (err, results) => {
                if (err) return reject(err);
                if (results.length === 0) {
                    resolve([]);  // No records found
                } else {
                    const row = results[0];
                    const opportunity = {
                        id: row.opportunityId,
                        title: row.opportunityTitle,
                    };
                    const assessment = {
                        grade: row.grade,
                        did_progress_towards_life_purpose: row.did_progress_towards_life_purpose,
                        did_help_another_person: row.did_help_another_person,
                        do_differently: row.do_differently,
                        comments: row.comments,
                    };
                    const tasks = row.tasks ? row.tasks.split(',') : [];
                    const tasksWithStatus = tasks.map(taskString => {
                        const [name, status] = taskString.split(':');
                        return { name, status: parseInt(status) };
                    });

                    const fileNames = row.fileNames ? row.fileNames.split(',') : [];
                    const fileUrls = row.fileUrls ? row.fileUrls.split(',') : [];
                    const fileTypes = row.fileTypes ? row.fileTypes.split(',') : [];
                    const fileSizes = row.fileSizes ? row.fileSizes.split(',') : [];
                    const original_filenames = row.fileOriginalName ? row.fileOriginalName.split(',') : [];

                    const correctedFiles = fileNames.map((name, index) => {
                        const type = fileTypes[index] || ''; // Get the type or default to an empty string
                        const extension = name.split('.').pop().toLowerCase(); // Get the lowercase file extension
                        // Map common file extensions to mimetypes
                        const extensionToMimetype = {
                            'pdf': 'application/pdf',
                            'jpg': 'image/jpeg',
                            'jpeg': 'image/jpeg',
                            'png': 'image/png',
                            'mpeg': 'audio/mpeg',
                            'm4a': 'audio/m4a',
                            'mp3': 'audio/mp3',
                            'mp4': 'video/mp4',
                            // Add more mappings as needed
                        };
                        // Use the mapped mimetype if available, otherwise use the existing type
                        const correctedType = extensionToMimetype[extension] || type;
                        return {
                            original_filename: original_filenames[index], // Use the original_filename retrieved from the database
                            name,
                            url: fileUrls[index], // Use the URL retrieved from the database
                            type: correctedType,
                            size: fileSizes[index],
                        };
                    });

                    const goals = row.goals ? row.goals.split(';') : [];
                    const formattedGoals = goals.map(goalString => {
                        const [name, description] = goalString.split(':');
                        return { name, description };
                    });

                    const successCriteria = row.successCriteria ? row.successCriteria.split(';') : [];
                    const formattedSuccessCriteria = successCriteria.map(scString => {
                        const [name, importance, priority] = scString.split(':');
                        return { name, importance, priority };
                    });

                    const options = row.options ? row.options.split(',') : [];

                    const decisions = [];
                    const decisionStrings = row.decisions ? row.decisions.split(';') : [];
                    decisionStrings.forEach(decisionString => {
                        const [name, reason] = decisionString.split(':');
                        decisions.push({ name, reason });
                    });

                    const tags = row.tags ? row.tags.split(',') : [];

                    const opportunityWithTaskProgress = {
                        opportunity,
                        assessment,
                        tasks: tasksWithStatus,
                        tags,
                        files: correctedFiles,
                        is_completed_assessment: row.is_completed_assessment,
                        goals: formattedGoals,
                        successCriteria: formattedSuccessCriteria,
                        options: options.map(name => ({ name })),
                        decisions
                    };
                    resolve([opportunityWithTaskProgress]);
                }
            });
        });
    }

    async getCreatedExperienceDetails(req, res) {
        const { start, size, filters, globalFilter, sorting } = req.query;
        const userId = req.params.id;
        const page = Math.floor(start / size) + 1;
        const parsedFilters = filters ? JSON.parse(filters) : [];
        const parsedSortings = sorting ? JSON.parse(sorting) : [];

        try {
            const experiences = await KnowledgePillarModel.fetchALLCreatedExperienceDetails(page, size, parsedFilters, globalFilter, parsedSortings, userId, 1);

            return ResponseHelper.respond(200, true, {
                experiences
            }, 'Successfully retrieved experiences data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async fetchALLCreatedOpportunityDetails(page = 1, itemsPerPage = 10, filters = [], globalFilter = '', sorting = [], type) {
        if (isNaN(page) || page <= 0) {
            page = 1;
        }
        const offset = (page - 1) * itemsPerPage;
        const sortConditions = this.clientBuildSortConditions(sorting); // Build sort conditions based on sorting
        const globalSearchCondition = this.buildGlobalExpSearch(globalFilter);
        try {
            const totalRowCount = await this.getLifebookCount(globalSearchCondition, type);

            let query = `
            SELECT
                lb.id as id,
                lb.title,
                CASE lb.is_completed_assessment
                WHEN '0' THEN 'no'
                WHEN '1' THEN 'yes'
                ELSE 'Unknown'
            END AS is_completed_assessment,
                lb.publish_date,
                CASE lb.status
                    WHEN '1' THEN 'active'
                    WHEN '2' THEN 'closed'
                    ELSE 'Unknown'
                END AS status,
                u.name,
                u.id AS userId
            FROM
                life_books lb
            LEFT JOIN
                users u ON lb.user_id = u.id
            WHERE
                lb.type = ?`;

            if (globalSearchCondition) {
                query += ` AND ${globalSearchCondition}`;
            }

            query += `
                ${sortConditions}
                LIMIT ${itemsPerPage}
                OFFSET ${offset};
            `;

            const results = await new Promise((resolve, reject) => {
                db.query(query, [type], (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });

            const data = results.map(row => ({
                experienceID: row.id,
                title: row.title,
                is_completed_assessment: row.is_completed_assessment,
                publish_date: row.publish_date,
                status: row.status,
                userId: row.userId,
                username: row.name,
            }));

            const meta = {
                totalRowCount: totalRowCount
            };

            const response = {
                data: data,
                meta: meta,
            };
            return response;
        } catch (error) {
            throw error;
        }
    }

    clientBuildSortConditions(sorting) {
        if (!Array.isArray(sorting) || sorting.length === 0) {
            return 'ORDER BY id DESC'; // Default sorting if no valid sorting criteria are provided
        }

        const conditions = sorting.map(sort => {
            if (sort.sortBy && sort.sortOrder) { // Check if sortBy and sortOrder are not empty strings
                const { sortBy, sortOrder } = sort;
                const direction = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
                return `${sortBy} ${direction}`;
            }
            return ''; // Skip invalid sorting criteria
        }).filter(condition => condition); // Filter out empty strings

        if (conditions.length > 0) {
            return `ORDER BY ${conditions.join(', ')}`;
        }

        return 'ORDER BY id DESC'; // Default sorting if no valid sorting criteria are provided
    }

    async getLifebookCount(globalSearchCondition, type) {
        try {
            let query = `
            SELECT
                COUNT(*) AS total,
                u.name
                FROM
                life_books lb
            LEFT JOIN
                users u ON lb.user_id = u.id
            WHERE
                lb.type = ?      
            `;

            if (globalSearchCondition) {
                query += `
                    AND ${globalSearchCondition}`;
            }

            query += `;`;

            const results = await new Promise((resolve, reject) => {
                db.query(query, [type], (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });

            return results[0].total;
        } catch (error) {
            throw error;
        }
    }

    buildGlobalExpSearch(globalFilter) {
        if (!globalFilter) {
            return ''; // Return an empty string if globalFilter is not provided
        }

        const fields = ['u.name', 'lb.title', 'lb.publish_date', 'lb.status', 'lb.is_completed_assessment']; // Updated to include only columns from the SELECT clause
        const conditions = fields.map(field => `${field} LIKE '%${globalFilter}%'`);
        return `(${conditions.join(' OR ')})`; // Removed the leading 'AND'
    }

    async fetchALLOpportunityAllTasks(page = 1, itemsPerPage = 10, filters = [], globalFilter = '', sorting = [], type) {
        if (isNaN(page) || page <= 0) {
            page = 1;
        }
        const offset = (page - 1) * itemsPerPage;
        const sortConditions = this.clientBuildSortConditions(sorting); // Build sort conditions based on sorting
        const globalSearchCondition = this.buildGlobalAllTaskSearch(globalFilter);
        try {
            const totalRowCount = await this.getLifebookOppTaskCount(globalSearchCondition, type);
    
            let query = `
                SELECT
                    lb.id as id,
                    lb.title AS experienceTitle,
                    lbt.name,
                    lbt.created_at,
                    CASE lbt.status
                        WHEN '0' THEN 'active'
                        WHEN '1' THEN 'completed'
                        ELSE 'Unknown'
                    END AS status,
                    u.name AS userName
                FROM
                    life_books lb
                LEFT JOIN
                    life_book_has_tasks lbt ON lb.id = lbt.lb_id
                LEFT JOIN
                    users u ON lb.user_id = u.id
                WHERE
                    lb.type = ? AND lbt.id IS NOT NULL`; // Only include records where lb_id has tasks
    
            if (globalSearchCondition) {
                query += ` AND ${globalSearchCondition}`;
            }
    
            query += `
                ${sortConditions}
                LIMIT ?
                OFFSET ?;
            `;
    
            const params = [type, parseInt(itemsPerPage), offset];
            const results = await new Promise((resolve, reject) => {
                db.query(query, params, (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });
    
            const data = results.map(row => ({
                experienceID: row.id,
                experienceTitle: row.experienceTitle,
                userName: row.userName,
                name: row.name,
                created_at: row.created_at,
                status: row.status
            }));
    
            const meta = {
                totalRowCount: totalRowCount
            };
    
            const response = {
                data: data,
                meta: meta,
            };
            return response;
        } catch (error) {
            throw error;
        }
    }
    

    buildGlobalAllTaskSearch(globalFilter) {
        if (!globalFilter) {
            return '';
        }
        const fields = ['lb.title', 'lbt.name', 'u.name', 'lbt.status', 'lbt.created_at'];
        const conditions = fields.map(field => `${field} LIKE '%${globalFilter}%'`);
        return `(${conditions.join(' OR ')})`;
    }

    async getLifebookOppTaskCount(globalSearchCondition, type) {
        try {
            let query = `
            SELECT
                COUNT(*) AS total
                FROM
                life_books lb
                    LEFT JOIN
                life_book_has_tasks lbt ON lb.id = lbt.lb_id
                    LEFT JOIN
                users u ON lb.user_id = u.id
            WHERE
                lb.type = ?      
            `;

            if (globalSearchCondition) {
                query += `
                    AND ${globalSearchCondition}`;
            }

            query += `;`;
            const results = await new Promise((resolve, reject) => {
                db.query(query, [type], (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });

            return results[0].total;
        } catch (error) {
            throw error;
        }
    }


}

module.exports = new DecisionPillarModel();
