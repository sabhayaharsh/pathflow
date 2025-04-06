const db = require('../../config/database');

class dashboardModel {

    async fetchUserCount() {
        // const query = `
        //     SELECT 
        //         (SELECT COUNT(id) FROM users) AS totalUsers,
        //         (SELECT COUNT(id) FROM users WHERE status = '1') AS activeUsers,
        //         (SELECT COUNT(id) FROM users WHERE status != '1') AS inActiveUsers,
        //         (SELECT COUNT(id) FROM admin ad WHERE ad.is_super_admin = '0') AS totalAdminUsers,
        //         (SELECT COUNT(id) FROM admin WHERE status = '1') AS activeAdminUsers,
        //         (SELECT COUNT(id) FROM admin WHERE status != '1') AS inActiveAdminUsers,
        //         (SELECT COUNT(id) FROM life_books WHERE type = '1') AS totalExperience,
        //         (SELECT COUNT(id) FROM life_books WHERE type = '1' AND status = '1') AS activeExperience,
        //         (SELECT COUNT(id) FROM life_books WHERE type = '1' AND status = '2') AS completeExperience,
        //         (SELECT COUNT(id) FROM life_books WHERE type = '2') AS totalOpportunity,
        //         (SELECT COUNT(id) FROM life_books WHERE type = '2' AND status = '1') AS activeOpportunity,
        //         (SELECT COUNT(id) FROM life_books WHERE type = '2' AND status = '2') AS completeOpportunity,
        //         (SELECT COUNT(id) FROM life_books WHERE type = '3') AS totalObservation,
        //         (SELECT COUNT(id) FROM life_books WHERE type = '3' AND status = '1') AS activeObservation,
        //         (SELECT COUNT(id) FROM life_books WHERE type = '3' AND status = '2') AS completeObservation,
        //         (SELECT COUNT(t.id) FROM life_book_has_tasks t
        //         JOIN life_books lb ON lb.id = t.lb_id
        //         WHERE lb.type = '1') AS totalExperienceTasks,
        //         (SELECT COUNT(t.id) FROM life_book_has_tasks t
        //         JOIN life_books lb ON lb.id = t.lb_id
        //         WHERE lb.type = '1' AND t.status = '0') AS activeExperienceTasks,
        //         (SELECT COUNT(t.id) FROM life_book_has_tasks t
        //         JOIN life_books lb ON lb.id = t.lb_id
        //         WHERE lb.type = '1' AND t.status = '1') AS completeExperienceTasks,
        //         (SELECT COUNT(t.id) FROM life_book_has_tasks t
        //         JOIN life_books lb ON lb.id = t.lb_id
        //         WHERE lb.type = '2') AS totalOpportunityTasks,
        //         (SELECT COUNT(t.id) FROM life_book_has_tasks t
        //         JOIN life_books lb ON lb.id = t.lb_id
        //         WHERE lb.type = '2' AND t.status = '0') AS activeOpportunityTasks,
        //         (SELECT COUNT(t.id) FROM life_book_has_tasks t
        //         JOIN life_books lb ON lb.id = t.lb_id
        //         WHERE lb.type = '2' AND t.status = '1') AS completeOpportunityTasks,
        //         (SELECT COUNT(t.id) FROM life_book_has_tasks t
        //         JOIN life_books lb ON lb.id = t.lb_id
        //         WHERE lb.type = '3') AS totalObservationTasks,
        //         (SELECT COUNT(t.id) FROM life_book_has_tasks t
        //         JOIN life_books lb ON lb.id = t.lb_id
        //         WHERE lb.type = '3' AND t.status = '0') AS activeObservationTasks,
        //         (SELECT COUNT(t.id) FROM life_book_has_tasks t
        //         JOIN life_books lb ON lb.id = t.lb_id
        //         WHERE lb.type = '3' AND t.status = '1') AS completeObservationTasks,
        //         (SELECT COUNT(id) FROM life_books WHERE type = '1') AS totalExperienceAssessments,
        //         (SELECT COUNT(id) FROM life_books WHERE type = '1' AND is_completed_assessment = '0') AS pendingExperienceAssessments,
        //         (SELECT COUNT(id) FROM life_books WHERE type = '1' AND is_completed_assessment = '1') AS completeExperienceAssessments,
        //         (SELECT COUNT(id) FROM life_books WHERE type = '2') AS totalOpportunityAssessments,
        //         (SELECT COUNT(id) FROM life_books WHERE type = '2' AND is_completed_assessment = '0') AS pendingOpportunityAssessments,
        //         (SELECT COUNT(id) FROM life_books WHERE type = '2' AND is_completed_assessment = '1') AS completeOpportunityAssessments,
        //         (SELECT COUNT(id) FROM life_books WHERE type = '3') AS totalObservationAssessments,
        //         (SELECT COUNT(id) FROM life_books WHERE type = '3' AND is_completed_assessment = '0') AS pendingObservationAssessments,
        //         (SELECT COUNT(id) FROM life_books WHERE type = '3' AND is_completed_assessment = '1') AS completeObservationAssessments
        //     FROM life_books;
        // `;
        
        const query = `SELECT 
                (SELECT COUNT(id) FROM users) AS totalUsers,
                (SELECT COUNT(id) FROM users WHERE STATUS = '1') AS activeUsers,
                (SELECT COUNT(id) FROM users WHERE STATUS != '1') AS inActiveUsers,
                (SELECT COUNT(id) FROM admin ad WHERE ad.is_super_admin = '0') AS totalAdminUsers,
                (SELECT COUNT(id) FROM admin ad WHERE ad.STATUS = '1' AND ad.is_super_admin = '0') AS activeAdminUsers,
                (SELECT COUNT(id) FROM admin ad WHERE ad.STATUS != '1' AND ad.is_super_admin = '0') AS inActiveAdminUsers,
                (SELECT COUNT(id) FROM life_books WHERE TYPE = '1') AS totalExperience,
                (SELECT COUNT(id) FROM life_books WHERE TYPE = '1' AND STATUS = '1') AS activeExperience,
                (SELECT COUNT(id) FROM life_books WHERE TYPE = '1' AND STATUS = '2') AS completeExperience,
                (SELECT COUNT(id) FROM life_books WHERE TYPE = '2') AS totalOpportunity,
                (SELECT COUNT(id) FROM life_books WHERE TYPE = '2' AND STATUS = '1') AS activeOpportunity,
                (SELECT COUNT(id) FROM life_books WHERE TYPE = '2' AND STATUS = '2') AS completeOpportunity,
                (SELECT COUNT(id) FROM life_books WHERE TYPE = '3') AS totalObservation,
                (SELECT COUNT(id) FROM life_books WHERE TYPE = '3' AND STATUS = '1') AS activeObservation,
                (SELECT COUNT(id) FROM life_books WHERE TYPE = '3' AND STATUS = '2') AS completeObservation,
                (SELECT COUNT(t.id) FROM life_book_has_tasks t
                JOIN life_books lb ON lb.id = t.lb_id
                WHERE lb.type = '1') AS totalExperienceTasks,
                (SELECT COUNT(t.id) FROM life_book_has_tasks t
                JOIN life_books lb ON lb.id = t.lb_id
                WHERE lb.type = '1' AND t.status = '0') AS activeExperienceTasks,
                (SELECT COUNT(t.id) FROM life_book_has_tasks t
                JOIN life_books lb ON lb.id = t.lb_id
                WHERE lb.type = '1' AND t.status = '1') AS completeExperienceTasks,
                (SELECT COUNT(t.id) FROM life_book_has_tasks t
                JOIN life_books lb ON lb.id = t.lb_id
                WHERE lb.type = '2') AS totalOpportunityTasks,
                (SELECT COUNT(t.id) FROM life_book_has_tasks t
                JOIN life_books lb ON lb.id = t.lb_id
                WHERE lb.type = '2' AND t.status = '0') AS activeOpportunityTasks,
                (SELECT COUNT(t.id) FROM life_book_has_tasks t
                JOIN life_books lb ON lb.id = t.lb_id
                WHERE lb.type = '2' AND t.status = '1') AS completeOpportunityTasks,
                (SELECT COUNT(t.id) FROM life_book_has_tasks t
                JOIN life_books lb ON lb.id = t.lb_id
                WHERE lb.type = '3') AS totalObservationTasks,
                (SELECT COUNT(t.id) FROM life_book_has_tasks t
                JOIN life_books lb ON lb.id = t.lb_id
                WHERE lb.type = '3' AND t.status = '0') AS activeObservationTasks,
                (SELECT COUNT(t.id) FROM life_book_has_tasks t
                JOIN life_books lb ON lb.id = t.lb_id
                WHERE lb.type = '3' AND t.status = '1') AS completeObservationTasks,
                (SELECT COUNT(id) FROM life_books WHERE TYPE = '1') AS totalExperienceAssessments,
                (SELECT COUNT(id) FROM life_books WHERE TYPE = '1' AND is_completed_assessment = '0') AS pendingExperienceAssessments,
                (SELECT COUNT(id) FROM life_books WHERE TYPE = '1' AND is_completed_assessment = '1') AS completeExperienceAssessments,
                (SELECT COUNT(id) FROM life_books WHERE TYPE = '2') AS totalOpportunityAssessments,
                (SELECT COUNT(id) FROM life_books WHERE TYPE = '2' AND is_completed_assessment = '0') AS pendingOpportunityAssessments,
                (SELECT COUNT(id) FROM life_books WHERE TYPE = '2' AND is_completed_assessment = '1') AS completeOpportunityAssessments,
                (SELECT COUNT(id) FROM life_books WHERE TYPE = '3') AS totalObservationAssessments,
                (SELECT COUNT(id) FROM life_books WHERE TYPE = '3' AND is_completed_assessment = '0') AS pendingObservationAssessments,
                (SELECT COUNT(id) FROM life_books WHERE TYPE = '3' AND is_completed_assessment = '1') AS completeObservationAssessments
            FROM life_books`;

        return new Promise((resolve, reject) => {
            db.query(query, (err, results) => {
                if (err) { return reject(err) }
                if (results.length === 0) {
                    const adminDataCount = {
                        userDetails: {
                            totalUsers: 0,
                            activeUsers: 0,
                            inActiveUsers: 0
                        },
                        adminUserDetails: {
                            totalUsers: 0,
                            activeUsers: 0,
                            inActiveUsers: 0
                        },
                        knowledgeDetails: {
                            totalExperience: 0,
                            activeExperience: 0,
                            completeExperience: 0
                        },
                        experienceTasksDetails: {
                            totalExperienceTasks: 0,
                            activeExperienceTasks: 0,
                            completeExperienceTasks: 0
                        },
                        experienceAssessmentDetails: {
                            totalAssessments: 0,
                            pendingAssessments: 0,
                            completeAssessments: 0
                        },
                        opportunityDetails: {
                            totalOpportunity: 0,
                            activeOpportunity: 0,
                            completeOpportunity: 0
                        },
                        opportunityTasksDetails: {
                            totalOpportunityTasks: 0,
                            activeOpportunityTasks: 0,
                            completeOpportunityTasks: 0
                        },
                        opportunityAssessmentDetails: {
                            totalAssessments: 0,
                            pendingAssessments: 0,
                            completeAssessments: 0
                        },
                        observationDetails: {
                            totalObservation: 0,
                            activeObservation: 0,
                            completeObservation: 0
                        },
                        observationTasksDetails: {
                            totalObservationTasks: 0,
                            activeObservationTasks: 0,
                            completeObservationTasks: 0
                        },
                        observationAssessmentDetails: {
                            totalAssessments: 0,
                            pendingAssessments: 0,
                            completeAssessments: 0
                        }
                    };
                    return resolve(adminDataCount);
                }

                const { totalUsers, activeUsers, inActiveUsers,
                    totalExperience, activeExperience, completeExperience,
                    totalOpportunity, activeOpportunity, completeOpportunity,
                    totalObservation, activeObservation, completeObservation,
                    totalExperienceTasks, activeExperienceTasks, completeExperienceTasks,
                    totalOpportunityTasks, activeOpportunityTasks, completeOpportunityTasks,
                    totalObservationTasks, activeObservationTasks, completeObservationTasks,
                    totalExperienceAssessments, pendingExperienceAssessments, completeExperienceAssessments,
                    totalOpportunityAssessments, pendingOpportunityAssessments, completeOpportunityAssessments,
                    totalObservationAssessments, pendingObservationAssessments, completeObservationAssessments,
                    totalAdminUsers, activeAdminUsers, inActiveAdminUsers
                } = results[0];

                const adminDataCount = {
                    userDetails: {
                        totalUsers,
                        activeUsers,
                        inActiveUsers
                    },
                    adminUserDetails: {
                        totalUsers: totalAdminUsers,
                        activeUsers: activeAdminUsers,
                        inActiveUsers: inActiveAdminUsers
                    },
                    knowledgeDetails: {
                        totalExperience,
                        activeExperience,
                        completeExperience
                    },
                    experienceTasksDetails: {
                        totalExperienceTasks,
                        activeExperienceTasks,
                        completeExperienceTasks
                    },
                    experienceAssessmentDetails: {
                        totalAssessments: totalExperienceAssessments,
                        pendingAssessments: pendingExperienceAssessments,
                        completeAssessments: completeExperienceAssessments
                    },
                    opportunityDetails: {
                        totalOpportunity,
                        activeOpportunity,
                        completeOpportunity
                    },
                    opportunityTasksDetails: {
                        totalOpportunityTasks,
                        activeOpportunityTasks,
                        completeOpportunityTasks
                    },
                    opportunityAssessmentDetails: {
                        totalAssessments: totalOpportunityAssessments,
                        pendingAssessments: pendingOpportunityAssessments,
                        completeAssessments: completeOpportunityAssessments
                    },
                    observationDetails: {
                        totalObservation,
                        activeObservation,
                        completeObservation
                    },
                    observationTasksDetails: {
                        totalObservationTasks,
                        activeObservationTasks,
                        completeObservationTasks
                    },
                    observationAssessmentDetails: {
                        totalAssessments: totalObservationAssessments,
                        pendingAssessments: pendingObservationAssessments,
                        completeAssessments: completeObservationAssessments
                    }
                };
                resolve(adminDataCount);
            });
        });
    }
}

module.exports = new dashboardModel();
