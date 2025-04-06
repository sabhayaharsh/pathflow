const { resolve } = require('path');
const db = require('../../config/database');
const { type } = require('os');

class lifeBookModel {

    async fetchRecentLifeBooks(userId, type) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT id, title, is_completed_assessment AS completed_assessment FROM life_books
                WHERE user_id = ? AND type = ?
                ORDER BY publish_date DESC
                LIMIT 5;
            `;
            db.query(query, [userId, type], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    }

    async fetchPillarEventCount(userId) {
        const query = `
            SELECT
                type,
                COUNT(*) AS count
            FROM life_books
            WHERE user_id = ?
            GROUP BY type;
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);

                const pillarEventCount = {
                    knowledge: 0,
                    decision: 0,
                    awareness: 0,
                };

                results.forEach((row) => {
                    const { type, count } = row;
                    if (type === '1') pillarEventCount.knowledge = count;
                    else if (type === '2') pillarEventCount.decision = count;
                    else if (type === '3') pillarEventCount.awareness = count;
                });

                resolve(pillarEventCount);
            });
        });
    }

    async fetchPillarTaskCount(userId) {
        // const query = `
        //     SELECT
        //         COUNT(lbht.id) AS total,
        //         SUM(CASE WHEN lbht.status = '1' THEN 1 ELSE 0 END) AS completed,
        //         SUM(CASE WHEN lbht.status = '0' THEN 1 ELSE 0 END) AS active
        //     FROM life_books lb
        //     LEFT JOIN life_book_has_tasks lbht ON lb.id = lbht.lb_id
        //     WHERE lb.user_id = ?
        // `;


        const query = `
        SELECT 
        (SELECT COUNT(lbht.id) AS total
        FROM life_books lb LEFT JOIN life_book_has_tasks lbht ON lb.id = lbht.lb_id WHERE lb.user_id = ? AND lb.type = '1')
        AS Insightactivecount,
        (
        SELECT COUNT(lbht.id) AS total
        FROM life_books lb LEFT JOIN life_book_has_tasks lbht ON lb.id = lbht.lb_id WHERE lb.user_id = ? AND lb.type = '2') AS Decisionactivecount,
        (
        SELECT COUNT(lbht.id) AS total
        FROM life_books lb LEFT JOIN life_book_has_tasks lbht ON lb.id = lbht.lb_id WHERE lb.user_id = ? AND lb.type = '3' ) AS Mindfullnessactivecount      
        
        `;
    
        return new Promise((resolve, reject) => {
            db.query(query, [userId,userId,userId], (err, results) => {
                if (err) return reject(err);
    
                const [row] = results;
                const pillarTaskCount = {
                    Insightactivecount : row.Insightactivecount,
                    Decisionactivecount : row.Decisionactivecount,
                    Mindfullnessactivecount : row.Mindfullnessactivecount,
                    total : row.Insightactivecount + row.Decisionactivecount + row.Mindfullnessactivecount
                }
                // const pillarTaskCount = {
                //     total: row.total,
                //     completed: row.completed,
                //     active: row.active,
                // };
    
                resolve(pillarTaskCount);
            });
        });
    }
    

    async fetchCurrentMonthDates() {
        const currentDate = new Date();
        const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const allDatesInMonth = [];
        let currentDatePointer = new Date(currentMonthStart);
        while (currentDatePointer <= currentMonthEnd) {
            const dayOfMonth = currentDatePointer.getDate();
            allDatesInMonth.push(dayOfMonth.toString());
            currentDatePointer.setDate(dayOfMonth + 1);
        }
        return allDatesInMonth;
    }

    async fetchDailyTaskCount(userId, pillarType) {
        const currentDate = new Date();
        const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const allDatesInMonth = [];
        let currentDatePointer = new Date(currentMonthStart);
        while (currentDatePointer <= currentMonthEnd) {
            const dayOfMonth = currentDatePointer.getDate();
            allDatesInMonth.push(dayOfMonth.toString());
            currentDatePointer.setDate(dayOfMonth + 1);
        }

        const query = `
            SELECT
                DAY(lbt.created_at) AS day,
                COALESCE(COUNT(*), 0) AS dailyTaskCount
            FROM life_book_has_tasks lbt
            JOIN life_books lb ON lbt.lb_id = lb.id
            WHERE lbt.status='0' AND lb.user_id = ? AND lbt.created_at >= ? AND lb.type = ?
            GROUP BY day;
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId, currentMonthStart, pillarType], (err, results) => {
                if (err) return reject(err);

                const dailyTaskCounts = {};

                allDatesInMonth.forEach((date) => {
                    dailyTaskCounts[date] = 0;
                });

                results.forEach((row) => {
                    const { day, dailyTaskCount } = row;
                    dailyTaskCounts[day] = dailyTaskCount;
                });

                resolve(dailyTaskCounts);
            });
        });
    }

    async getSelfAssessmentGradeCounts(userId) {
        const gradeMapping = {
            1: 'A',
            2: 'B',
            3: 'C',
            4: 'D',
            5: 'F',
        };
    
        const typeMapping = {
            1: 'knowledge',
            2: 'decision',
            3: 'awareness',
        };
    
        const query = `
            SELECT
                lb.type,
                COUNT(lba.id) AS assessment_count,
                SUM(lba.grade) AS total_grade
            FROM life_book_has_assessment lba
            JOIN life_books lb ON lba.lb_id = lb.id
            WHERE lb.user_id = ?
            GROUP BY lb.type
        `;
    
        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
    
                if (results.length === 0) {
                    resolve({ gradeCounts: {}, maxGrade: 0 });
                    return;
                }
    
                const gradeCounts = {};
                let totalSum = 0;
                let totalEntries = 0;
                let maxGradeAverage = 0;
    
                // Accumulate total average grades and find max grade
                results.forEach(({ type, assessment_count, total_grade }) => {
                    // Calculate the average for this type
                    const averageGrade = total_grade / assessment_count;
                    const roundedAverage = Math.round(averageGrade);
                    
                    // Store the average grade for this type
                    gradeCounts[typeMapping[type]] = roundedAverage;
    
                    totalSum += total_grade;
                    totalEntries += assessment_count;
    
                    if (averageGrade > maxGradeAverage) {
                        maxGradeAverage = averageGrade;
                    }
                });
    
                // Calculate overall average of all types
                const maxGrade = Math.round(totalSum / totalEntries); // Calculate overall average of all types
    
                resolve({ gradeCounts, maxGrade });
            });
        });
    }
    

    async getGlobalSearchData({ userId, searchData }) {
        const query = `
           SELECT
            lb.id,
            lb.title,
            lb.type,
            lbt.name AS task_name,
            CASE 
                WHEN lbt.id IS NOT NULL THEN 'Yes' 
                ELSE 'No' 
            END AS has_task
        FROM
            life_books lb
        LEFT JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
        WHERE
            lb.title LIKE ? OR
            lbt.name LIKE ?
        ORDER BY lb.type, lb.id, lbt.id;
        `;
        const searchValue = '%' + searchData.replace(/%/g, '\\%') + '%';

        return new Promise((resolve, reject) => {
            db.query(query, [searchValue, searchValue], (err, results) => {
                if (err) return reject(err);

                /////////////modified data on 31/07/2024 
                let lifeBooksData = [];
                let tasksData = [];
                results.forEach(row => {
                    // Extract data from life_books
                    let lifeBookRow = {
                        id: row.lb_id,
                        title: row.lb_title,
                        type: row.lb_type
                    };

                    // Only add unique life books to the array
                    if (!lifeBooksData.find(book => book.id === lifeBookRow.id)) {
                        lifeBooksData.push(lifeBookRow);
                    }

                    // Extract data from life_book_has_tasks
                    if (row.task_id !== null) {
                        let taskRow = {
                            id: row.task_id,
                            name: row.task_name,
                            has_task: row.has_task
                        };
                        tasksData.push(taskRow);
                    }
                });

                // Output the results
                // console.log('Life Books Data:', lifeBooksData);
                // console.log('Tasks Data:', tasksData);             


                const data = results.map((row) => ({
                    id: row.id,
                    title: row.title,
                    type: row.type,
                    taskName: row.task_name,
                    hasTask: row.has_task === 'Yes'
                }));
                console.log("data", data);
                resolve(data);
            });
        });
    }


    async getGlobalSearchDataCus({ searchData , userId}) {
       
        return new Promise(async (resolve, reject) => {
            const query = `SELECT lb.id, lb.title, lb.type FROM life_books lb WHERE lb.user_id = ? and lb.title LIKE ? `;

            // comment on 22-08-2024 for create bug when search data using blank space.
            //const searchValue = '%' + searchData.replace(/%/g, '\\%') + '%';
            const Searchvalues = '%' + searchData + '%';
           
            try {
                const results = await new Promise((resolve, reject) => {
                    db.query(query, [userId,Searchvalues], (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                });
    
                const experiences = results.map(element => ({
                    id: element.id,
                    title: element.title,
                    type: element.type
                }));
    
                resolve(experiences);
    
            } catch (error) {
                console.error("Error fetching global search data:", error);
                reject(error);
            }
        });
    }
    
    async getGlobalTasksBySearch(searchData , userId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT t.id, t.lb_id, t.name, t.status, lb.type AS pillar
                FROM life_book_has_tasks t
                JOIN life_books lb ON t.lb_id = lb.id
                WHERE  lb.user_id = ? and t.name LIKE ?`;
    
            //const searchValue = '%' + searchData.replace(/%/g, '\\%') + '%';
            const searchValue = '%' + searchData.replace(/[%_]/g, '\\$&') + '%';

            db.query(query, [userId , searchValue], (err, results) => {
                if (err) {
                    return reject(err);
                }
    
                const tasks = results.map(task => ({
                    id: task.id,
                    taskName: task.name,
                    status: task.status,
                    pillar: task.pillar === '1' ? 'Knowledge' :
                            task.pillar === '2' ? 'Decision' :
                            task.pillar === '3' ? 'Awareness' : 'Other'
                }));
    
                resolve(tasks);
            });
        });
    }

    async getGlobalSearchDataById(serachid,type)
    {
       return new Promise((resolve, reject) => {
            if (type==='experiences') {
                const query = `SELECT lb.id,lb.user_id,lb.title,lb.is_completed_task,lb.is_completed_assessment,lb.publish_date,lb.type,lb.status,lb.created_at FROM life_books lb WHERE lb.id = ?`
                db.query(query, [serachid], async (err, results) => {
                    if (err) {
                        return reject(err);
                    }
                    const experiences = await results.map(task => ({
                        id: task.id,
                        title: task.title,
                        isCompletedTask: task.is_completed_task,
                        isCompletedAssessment: task.is_completed_assessment,
                        publishDate: task.publish_date,
                        type: task.type,
                        status: task.status,
                        created_at: task.created_at
                    }));        
                    resolve(experiences);
                });
            }
            if (type==='tasks') {
                const query = `SELECT lbht.id,lbht.lb_id,lbht.name,lbht.status,lbht.created_at FROM life_book_has_tasks lbht WHERE id = ?`
                db.query(query, [serachid], async (err, results) => {
                    if (err) {
                        return reject(err);
                    }
                    const tasks = results.map(task => ({
                        id: task.id,
                        lb_id: task.lb_id,
                        name: task.name,
                        status: task.status,
                        createdAt: task.created_at
                    }));      
                    resolve(tasks);
                });
            }

       });
    }
}
module.exports = new lifeBookModel();