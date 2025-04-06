const cron = require('node-cron');
const db = require("../config/database");
const fs = require('node:fs');
const ResponseHelper = require('../helpers/responseHelper');


async function GetCompletedAssessments()
{
  const query = `SELECT usr.id AS user_id, usr.name AS username, usr.email AS email,lb.id AS experince_id,lb.title AS experince_title, lb.type AS typess, lb.created_at AS Created_Date FROM users usr LEFT JOIN life_books lb ON usr.id = lb.user_id WHERE lb.is_completed_assessment = '0' AND lb.is_completed_task = '1' AND lb.updated_at < DATE_SUB(NOW(),INTERVAL 48 HOUR) AND lb.updated_at > DATE_SUB(NOW(),INTERVAL 72 HOUR)`;
          try {
            const groups = await new Promise((resolve, reject) => {
              db.query(query, async (err, result) => {
                  if (err) {
                      reject(err);
                  } else {
                      resolve(result);

                      let emailaddress  = result.map(a=>a.email); // all email from database 

                      // Remove Duplicates from emailaddress
                      const Actualemail = emailaddress.filter(
                        (value, index, array) => array.indexOf(value) === index
                     );

                      Actualemail.forEach(async element => {
                         const email = element ;
                         let matchingData = result.filter(row => row.email === element);
                         await SenEmail(email,matchingData);
                      });
                }
              });
            });
    return groups;
    } catch (error) {
      var date_time = new Date();
      const content = `The error on Notification Send ${error}---${date_time}--`;

         await LogEntry(content);
        console.error(error);
        throw error;
    }
}

async function SenEmail(email,result)
{
   const verificationToken = ResponseHelper.generateVerificationToken();
   const Assessmentslink = [];
   let username = "";
   for (let i = 0; i < result.length; i++) {
    const row = result[i];
    let AssessmentsLinks = "";
    let ExperinceName = "";
    username = result[0].username;
    if (row.typess === "1") {
      AssessmentsLinks = `${process.env.FRONTEND_URL}/knowledgeDashboard?id=${row.experince_id}`;
      ExperinceName = row.experince_title;
      Assessmentslink.push({ url: AssessmentsLinks, name: ExperinceName });
    }
    if (row.typess === "2") {
      AssessmentsLinks = `${process.env.FRONTEND_URL}/decisionDashboard?id=${row.experince_id}`;
      ExperinceName = row.experince_title;
      Assessmentslink.push({ url: AssessmentsLinks, name: ExperinceName });
    }
    if (row.typess === "3") {
      AssessmentsLinks = `${process.env.FRONTEND_URL}/awarenessDashboard?id=${row.experince_id}`;
      ExperinceName = row.experince_title;
      Assessmentslink.push({ url: AssessmentsLinks, name: ExperinceName });
    }
  }
    let htmlformat = "";
    Assessmentslink.forEach(element => {
      htmlformat += `<a href='${element.url}'>${element.name}</a><br>`;
      htmlformat +=`<br>`;
    });    
    const replacements = {
      USERNAME: username,
      ASSESSMENTS_LINK: htmlformat,
      COMPANY_NAME: process.env.APPNAME,
      BASE_URL: process.env.BASE_URL
     };
           await ResponseHelper.sendEmail(email, 'Pathmaker - Notification For Pending Assessments', 'AssessmentsPending', replacements);
            var date_time = new Date();
            const content = `\n The Email Notification Send To ${email}---${date_time}--\n`;
            await LogEntry(content);

}
async function LogEntry(content)
{
    fs.appendFile('./log/logtext.txt',content,function (err) {
      if (err) { 
        console.log("Error",err); 
      }else{
        console.log("log Saved !");
      }        
    });
}

cron.schedule('0 0 * * *', GetCompletedAssessments);
module.exports = GetCompletedAssessments;
