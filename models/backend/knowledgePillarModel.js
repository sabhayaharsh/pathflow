const db = require('../../config/database');

class KnowledgePillarModel {

    async GetExperienceUserById(experienceId) {
        const query = `
        SELECT
            lb.id AS experienceId,
            lb.title AS experienceTitle,
            lb.is_completed_assessment as is_completed_assessment,
            lea.id AS assessmentId,
            lea.grade,
            lea.did_progress_towards_life_purpose,
            lea.did_help_another_person,
            lea.do_differently,
            lea.comments,
            GROUP_CONCAT(DISTINCT ki.name ORDER BY ki.id ASC) AS insights,
            GROUP_CONCAT(DISTINCT ken.name ORDER BY ken.id ASC) AS notes,
            GROUP_CONCAT(DISTINCT CONCAT(lbt.name, ':', lbt.status) ORDER BY lbt.id ASC) AS tasks,
            GROUP_CONCAT(DISTINCT lbht.name ORDER BY lbht.id ASC) AS tags,
            GROUP_CONCAT(DISTINCT lbhf.name ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END) AS fileNames,
            GROUP_CONCAT(DISTINCT lbhf.url ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END) AS fileUrls,
            GROUP_CONCAT(DISTINCT lbhf.type ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END) AS fileTypes,
            GROUP_CONCAT(DISTINCT lbhf.size ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END) AS fileSizes,
            GROUP_CONCAT(DISTINCT lbhf.original_filename ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END) AS fileOriginalName
        FROM life_books lb
        LEFT JOIN life_book_has_assessment lea ON lb.id = lea.lb_id
        LEFT JOIN knowledge_experience_insights ki ON lb.id = ki.lb_id
        LEFT JOIN knowledge_experience_notes ken ON lb.id = ken.lb_id
        LEFT JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
        LEFT JOIN life_book_has_tags lbht ON lb.id = lbht.lb_id
        LEFT JOIN life_book_has_files lbhf ON lb.id = lbhf.lb_id
        WHERE lb.id = ?
        GROUP BY lb.id, lea.id
        LIMIT 1
    `;

        return new Promise((resolve, reject) => {
            db.query(query, [experienceId], (err, results) => {
                if (err) return reject(err);
                if (results.length === 0) {
                    resolve([]);
                } else {
                    const row = results[0];
                    const experience = {
                        id: row.experienceId,
                        title: row.experienceTitle,
                    };
                    const assessment = {
                        id: row.assessmentId,
                        grade: row.grade,
                        did_progress_towards_life_purpose: row.did_progress_towards_life_purpose,
                        did_help_another_person: row.did_help_another_person,
                        do_differently: row.do_differently,
                        comments: row.comments,
                    };
                    const insights = row.insights ? row.insights.split(',') : [];
                    const notes = row.notes ? row.notes.split(',') : [];
                    const tasks = row.tasks ? row.tasks.split(',') : [];
                    const tasksWithStatus = tasks.map(taskString => {
                        const [name, status] = taskString.split(':');
                        return { name, status: parseInt(status) };
                    });

                    const tags = row.tags ? row.tags.split(',') : [];
                    const fileNames = row.fileNames ? row.fileNames.split(',') : [];
                    const fileUrls = row.fileUrls ? row.fileUrls.split(',') : [];
                    const fileTypes = row.fileTypes ? row.fileTypes.split(',') : [];
                    const fileSizes = row.fileSizes ? row.fileSizes.split(',') : [];
                    const original_filenames = row.fileOriginalName ? row.fileOriginalName.split(',') : [];

                    const correctedFiles = fileNames.map((name, index) => {
                        const type = fileTypes[index] || '';
                        const extension = name.split('.').pop().toLowerCase();

                        const extensionToMimetype = {
                            'pdf': 'application/pdf',
                            'jpg': 'image/jpeg',
                            'jpeg': 'image/jpeg',
                            'png': 'image/png',
                            'mpeg': 'audio/mpeg',
                            'm4a': 'audio/m4a',
                            'mp3': 'audio/mp3',
                            'mp4': 'video/mp4',
                        };

                        const correctedType = extensionToMimetype[extension] || type;
                        return {
                            original_filename: original_filenames[index],
                            name,
                            url: fileUrls[index],
                            type: correctedType,
                            size: fileSizes[index]
                        };
                    });

                    const experienceWithTaskProgress = {
                        experience,
                        assessment,
                        insights,
                        notes,
                        tasks: tasksWithStatus,
                        tags,
                        files: correctedFiles,
                        is_completed_assessment: row.is_completed_assessment
                    };
                    resolve([experienceWithTaskProgress]);
                }
            });
        });
    }
     
    async fetchALLCreatedExperienceDetails(page = 1, itemsPerPage = 10, filters = [], globalFilter = '', sorting = [], type) {
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
           
            // if (globalSearchCondition) {
            //     query += ` AND ${globalSearchCondition}`;
            // }
            if (globalSearchCondition) { 
                query += ` AND lb.title like '%${globalFilter}%'`;
                //query += ` OR lb.publish_date like '%${globalFilter}%'`;
                if (isDate(globalFilter)) {
                    query += ` OR DATE(lb.publish_date) = '${globalFilter}'`;  // Exact match for date
                } else {
                    query += ` OR lb.publish_date LIKE '%${globalFilter}%'`;    // Default LIKE comparison for partial match
                }
                query += ` OR u.name like '%${globalFilter}%'`;
               
                query += ` OR (lb.is_completed_assessment = '1' AND '${globalFilter}' = 'yes')`;
                query += ` OR (lb.is_completed_assessment = '0' AND '${globalFilter}' = 'no')`;

                query += ` OR (lb.status = '1' AND '${globalFilter}' = 'active')`;
                query += ` OR (lb.status = '2' AND '${globalFilter}' = 'closed')`;
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
            return '';
        }
        const fields = ['u.name', 'lb.title', 'lb.publish_date', 'lb.status', 'lb.is_completed_assessment'];
        const conditions = fields.map(field => `${field} LIKE '%${globalFilter}%'`);
        return `(${conditions.join(' OR ')})`;
    }

    async fetchALLExperienceAllTasks(page = 1, itemsPerPage = 10, filters = [], globalFilter = '', sorting = [], type) {
        if (isNaN(page) || page <= 0) {
            page = 1;
        }
        const offset = (page - 1) * itemsPerPage;
        const sortConditions = this.clientBuildSortConditions(sorting); // Build sort conditions based on sorting
        const globalSearchCondition = this.buildGlobalAllTaskSearch(globalFilter);
        try {
            const totalRowCount = await this.getLifebookexpTaskCount(globalSearchCondition, type);
    
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
    
            // Apply global search
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

    async getLifebookexpTaskCount(globalSearchCondition, type) {
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

function isDate(value) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;  // Match 'YYYY-MM-DD'
        return dateRegex.test(value);
    }
module.exports = new KnowledgePillarModel();
